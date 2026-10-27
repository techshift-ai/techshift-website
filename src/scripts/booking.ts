/**
 * Booking modal. Same-origin /api/availability and /api/book on techshift.ai (the Worker route).
 * pages.dev and any failed, non-JSON, or empty response use the fallback consultation link.
 * The Turnstile script loads only after the visitor reaches the details step.
 */

interface Slot {
  start: string;
  end: string;
}

interface TurnstileApi {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id?: string) => void;
}

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

function turnstileApi(): TurnstileApi | undefined {
  return (window as Window & { turnstile?: TurnstileApi }).turnstile;
}

const bookingRoot = document.getElementById('booking');
if (bookingRoot instanceof HTMLDialogElement && typeof bookingRoot.showModal === 'function') {
  const dlg: HTMLDialogElement = bookingRoot;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fallbackUrl = dlg.dataset.fallbackUrl ?? '';
  const contactEmail = dlg.dataset.contactEmail ?? '';
  const siteKey = dlg.dataset.turnstileSiteKey ?? '';
  const $ = <T extends Element>(sel: string, root: ParentNode = dlg) => root.querySelector<T>(sel);
  const $$ = <T extends Element>(sel: string, root: ParentNode = dlg) =>
    Array.from(root.querySelectorAll<T>(sel));

  const grid = $<HTMLElement>('#cal-grid');
  const timesH = $<HTMLElement>('#times-h');
  const timesBody = $<HTMLElement>('#times-body');
  const next = $<HTMLButtonElement>('#bk-next');
  const note = $<HTMLElement>('#foot-note');
  const form = $<HTMLFormElement>('#bk-form');
  const alertBox = $<HTMLElement>('#form-alert');
  const body = $<HTMLElement>('#bk-body');
  const fallbackCopy = $<HTMLElement>('#bk-fallback-copy');

  const visitorTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Toronto';
  const state: {
    slots: Slot[];
    byDay: Record<string, Slot[]>;
    day: string | null;
    slot: Slot | null;
    step: 'pick' | 'form' | 'done';
    opener: HTMLElement | null;
    loading: boolean;
  } = { slots: [], byDay: {}, day: null, slot: null, step: 'pick', opener: null, loading: false };

  let turnstileLoading: Promise<void> | null = null;
  let widgetId: string | undefined;
  let turnstileToken: string | undefined;
  let turnstileFailed = false;

  const partsOf = (date: Date, timeZone: string) => {
    const out: Record<string, string> = {};
    for (const part of new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
    }).formatToParts(date)) {
      out[part.type] = part.value;
    }
    return out;
  };
  const dayKey = (date: Date, timeZone: string) => {
    const p = partsOf(date, timeZone);
    return `${p.year}-${p.month}-${p.day}`;
  };
  const fmt = (date: Date, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(undefined, { timeZone: visitorTz, ...options }).format(date);
  const tzName = (date: Date) => {
    const name = new Intl.DateTimeFormat(undefined, { timeZone: visitorTz, timeZoneName: 'long' })
      .formatToParts(date)
      .find((part) => part.type === 'timeZoneName')?.value;
    const city = visitorTz.split('/').pop()?.replace(/_/g, ' ') ?? visitorTz;
    return `${name ?? visitorTz} (${city})`;
  };
  const timeLabel = (iso: string) => fmt(new Date(iso), { hour: 'numeric', minute: '2-digit' });
  const slotLabel = (iso: string) =>
    `${fmt(new Date(iso), { weekday: 'long', month: 'long', day: 'numeric' })}, ${timeLabel(iso)}`;
  const isSlot = (value: unknown): value is Slot => {
    if (typeof value !== 'object' || value === null) return false;
    const slot = value as Slot;
    return ISO.test(slot.start) && ISO.test(slot.end);
  };

  function showFallback(lead: string) {
    dlg.classList.add('is-fallback');
    if (fallbackCopy) {
      const strong = document.createElement('b');
      strong.textContent = lead;
      fallbackCopy.replaceChildren(
        strong,
        document.createElement('br'),
        'You can still book a free consultation.',
      );
    }
    $<HTMLAnchorElement>('#bk-fallback')?.focus();
  }

  async function fetchSlots(): Promise<Slot[] | 'fallback' | 'empty'> {
    try {
      const res = await fetch(
        `/api/availability?from=${encodeURIComponent(new Date().toISOString())}`,
        {
          headers: { Accept: 'application/json' },
        },
      );
      const type = res.headers.get('content-type') ?? '';
      if (!res.ok || !type.includes('application/json')) return 'fallback';
      const data = (await res.json()) as { slots?: unknown };
      if (!Array.isArray(data.slots)) return 'fallback';
      const slots = data.slots.filter(isSlot);
      return slots.length > 0 ? slots : 'empty';
    } catch {
      return 'fallback';
    }
  }

  function loadTurnstile() {
    if (turnstileApi()) return Promise.resolve();
    if (turnstileLoading) return turnstileLoading;
    turnstileLoading = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        turnstileLoading = null;
        reject(new Error('turnstile'));
      };
      document.head.appendChild(script);
    });
    return turnstileLoading;
  }

  async function mountTurnstile() {
    const mount = document.getElementById('bk-turnstile');
    if (!siteKey || !mount || widgetId) return;
    try {
      await loadTurnstile();
      const api = turnstileApi();
      if (!api || widgetId) return;
      widgetId = api.render(mount, {
        sitekey: siteKey,
        callback: (token: string) => {
          turnstileToken = token;
        },
        'expired-callback': () => {
          turnstileToken = undefined;
        },
        'error-callback': () => {
          turnstileToken = undefined;
          turnstileFailed = true;
        },
      });
    } catch {
      turnstileToken = undefined;
    }
  }

  function renderSkeleton() {
    if (!grid || !timesH || !timesBody) return;
    grid.replaceChildren();
    for (let i = 0; i < 28; i++) {
      const cell = document.createElement('div');
      cell.className = 'sk sk-day';
      grid.append(cell);
    }
    grid.setAttribute('aria-busy', 'true');
    timesH.textContent = 'Loading available times…';
    timesBody.replaceChildren();
    const wrap = document.createElement('div');
    wrap.className = 'times';
    for (let i = 0; i < 6; i++) {
      const cell = document.createElement('div');
      cell.className = 'sk sk-time';
      wrap.append(cell);
    }
    timesBody.append(wrap);
  }

  function renderCalendar() {
    if (!grid || !timesH || !timesBody) return;
    grid.removeAttribute('aria-busy');
    grid.replaceChildren();
    state.byDay = {};
    for (const slot of state.slots) {
      const key = dayKey(new Date(slot.start), visitorTz);
      (state.byDay[key] ??= []).push(slot);
    }
    const now = new Date();
    const view = partsOf(now, visitorTz);
    const start = new Date(Date.UTC(Number(view.year), Number(view.month) - 1, Number(view.day)));
    const lead = (start.getUTCDay() + 6) % 7;
    for (let i = 0; i < lead; i++) {
      const pad = document.createElement('span');
      pad.setAttribute('aria-hidden', 'true');
      grid.append(pad);
    }
    const keys = Object.keys(state.byDay).sort();
    const lastKey = keys.at(-1);
    const span = lastKey
      ? Math.round((Date.parse(`${lastKey}T12:00:00Z`) - start.getTime()) / 86_400_000)
      : 30;
    const days = Math.min(Math.max(span, 0), 31);
    let first: HTMLButtonElement | null = null;
    for (let i = 0; i <= days; i++) {
      const date = new Date(start.getTime() + i * 86_400_000);
      const key = date.toISOString().slice(0, 10);
      const count = state.byDay[key]?.length ?? 0;
      const weekday = date.getUTCDay();
      const long = new Intl.DateTimeFormat(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      }).format(date);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'day';
      button.dataset.key = key;
      if (date.getUTCDate() === 1 || i === 0) {
        const month = document.createElement('em');
        month.className = 'mo';
        month.textContent = new Intl.DateTimeFormat(undefined, {
          month: 'short',
          timeZone: 'UTC',
        }).format(date);
        button.append(month);
      }
      const num = document.createElement('span');
      num.textContent = String(date.getUTCDate());
      button.append(num);
      if (count) {
        button.classList.add('day--open');
        const small = document.createElement('small');
        small.textContent = `${count} open`;
        button.append(small);
        button.setAttribute(
          'aria-label',
          `${long}, ${count} ${count === 1 ? 'time' : 'times'} available`,
        );
        first ??= button;
      } else if (weekday !== 0 && weekday !== 6 && key > dayKey(now, visitorTz)) {
        button.classList.add('day--full');
        const small = document.createElement('small');
        small.textContent = 'Full';
        button.append(small);
        button.setAttribute('aria-label', `${long}, fully booked`);
      } else {
        button.classList.add('day--off');
        button.setAttribute('aria-disabled', 'true');
        button.setAttribute('aria-label', `${long}, not available`);
      }
      button.setAttribute('aria-pressed', 'false');
      button.tabIndex = -1;
      grid.append(button);
    }
    const target =
      (state.day && grid.querySelector<HTMLButtonElement>(`[data-key="${state.day}"]`)) || first;
    if (target) target.tabIndex = 0;
    if (state.day) markDay(state.day);
    else {
      timesH.textContent = 'Pick a day to see times';
      timesBody.replaceChildren();
    }
  }

  function markDay(key: string) {
    if (!grid || !timesH || !timesBody) return;
    $$<HTMLButtonElement>('.day', grid).forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.key === key));
    });
    const list = state.byDay[key] ?? [];
    const label = new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${key}T12:00:00Z`));
    if (!list.length) {
      const nextKey = Object.keys(state.byDay)
        .sort()
        .find((day) => day > key);
      timesH.textContent = label;
      timesBody.replaceChildren();
      const empty = document.createElement('div');
      empty.className = 'empty';
      const p = document.createElement('p');
      const strong = document.createElement('b');
      strong.textContent = 'No times left on this day.';
      p.append(
        strong,
        document.createElement('br'),
        'It is fully booked. Try the next available day.',
      );
      empty.append(p);
      if (nextKey) {
        const jump = document.createElement('button');
        jump.type = 'button';
        jump.className = 'btn btn--ghost btn--sm';
        jump.dataset.jump = nextKey;
        jump.textContent = `Next available: ${new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${nextKey}T12:00:00Z`))}`;
        empty.append(jump);
      }
      timesBody.append(empty);
      return;
    }
    timesH.textContent = label;
    const group = document.createElement('div');
    group.className = 'times';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', `Available times on ${label}`);
    for (const slot of list) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'time';
      button.dataset.start = slot.start;
      button.setAttribute('aria-pressed', String(state.slot?.start === slot.start));
      button.textContent = timeLabel(slot.start);
      group.append(button);
    }
    timesBody.replaceChildren(group);
  }

  function selectDay(key: string, focusTimes = false) {
    state.day = key;
    if (state.slot && dayKey(new Date(state.slot.start), visitorTz) !== key) state.slot = null;
    $$<HTMLButtonElement>('.day', grid ?? dlg).forEach((button) => {
      button.tabIndex = button.dataset.key === key ? 0 : -1;
    });
    markDay(key);
    updateFoot();
    if (focusTimes) timesBody?.querySelector('button')?.focus();
  }

  function selectSlot(start: string) {
    state.slot = state.slots.find((slot) => slot.start === start) ?? {
      start,
      end: new Date(Date.parse(start) + 30 * 60_000).toISOString(),
    };
    $$<HTMLButtonElement>('.time', timesBody ?? dlg).forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.start === start));
    });
    updateFoot();
  }

  function fillSlotLabels() {
    if (!state.slot) return;
    $$('[data-slot-label]').forEach((el) => {
      el.textContent = slotLabel(state.slot!.start);
    });
    $$('[data-slot-tz]').forEach((el) => {
      el.textContent = `30 minutes, ${tzName(new Date(state.slot!.start))}`;
    });
  }

  function updateFoot() {
    if (!next || !note) return;
    next.hidden = false;
    if (state.step === 'pick') {
      next.disabled = !state.slot;
      next.textContent = 'Continue';
      note.replaceChildren();
      if (state.slot) {
        const span = document.createElement('span');
        span.textContent = 'Selected';
        const strong = document.createElement('b');
        strong.textContent = slotLabel(state.slot.start);
        note.append(span, strong);
      } else {
        const span = document.createElement('span');
        span.textContent = state.loading ? 'Loading times…' : 'No time selected';
        note.append(span);
      }
    } else if (state.step === 'form') {
      next.disabled = false;
      next.replaceChildren();
      const spin = document.createElement('span');
      spin.className = 'spin';
      spin.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.dataset.label = '';
      label.textContent = 'Confirm booking';
      next.append(spin, label);
      note.replaceChildren();
      const span = document.createElement('span');
      span.textContent = '30-minute call';
      const strong = document.createElement('b');
      strong.textContent = state.slot ? slotLabel(state.slot.start) : '';
      note.append(span, strong);
    } else {
      next.disabled = false;
      next.textContent = 'Done';
      note.replaceChildren();
      const span = document.createElement('span');
      span.textContent = 'Booked';
      const strong = document.createElement('b');
      strong.textContent = state.slot ? slotLabel(state.slot.start) : '';
      note.append(span, strong);
    }
  }

  function go(step: 'pick' | 'form' | 'done', focus = true) {
    state.step = step;
    $$<HTMLElement>('.bk-pane').forEach((pane) => {
      pane.hidden = pane.dataset.pane !== step;
    });
    const order = ['pick', 'form', 'done'];
    $$<HTMLElement>('.bk-steps li').forEach((item) => {
      const index = order.indexOf(item.dataset.step ?? '');
      const current = order.indexOf(step);
      item.classList.toggle('is-done', index < current);
      if (index === current) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });
    if (body) body.scrollTop = 0;
    fillSlotLabels();
    updateFoot();
    if (step === 'form') void mountTurnstile();
    if (!focus) return;
    if (step === 'form') $<HTMLElement>('#f-name')?.focus();
    if (step === 'done') $<HTMLElement>('#done-h')?.focus();
    if (step === 'pick') {
      (
        timesBody?.querySelector<HTMLElement>('[aria-pressed="true"]') ??
        grid?.querySelector<HTMLElement>('[tabindex="0"]')
      )?.focus();
    }
  }

  async function load() {
    state.loading = true;
    renderSkeleton();
    updateFoot();
    const result = await fetchSlots();
    state.loading = false;
    if (result === 'fallback') {
      showFallback('We could not load times right now.');
      return;
    }
    if (result === 'empty') {
      showFallback('No times are open right now.');
      return;
    }
    dlg.classList.remove('is-fallback');
    state.slots = result;
    renderCalendar();
    updateFoot();
    const label = $('[data-tz-label]');
    if (label) label.textContent = `Times shown in ${tzName(new Date())}`;
  }

  const checks: Record<string, (value: string) => boolean> = {
    name: (value) => value.trim().length >= 2,
    email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim()),
    business: (value) => value.trim().length >= 2,
    phone: (value) => !value.trim() || value.replace(/\D/g, '').length >= 10,
    website: (value) =>
      !value.trim() || /^(https?:\/\/)?[^\s.]+(\.[^\s.]+)+(\/\S*)?$/i.test(value.trim()),
  };

  function setField(name: string, ok: boolean, showValid = false) {
    const field = $<HTMLElement>(`[data-field="${name}"]`);
    if (!field) return;
    field.classList.toggle('is-invalid', !ok);
    field.classList.toggle('is-valid', ok && showValid);
    const input = field.querySelector('input,textarea');
    if (input && name !== 'issue') input.setAttribute('aria-invalid', String(!ok));
  }

  function validate(name: string) {
    if (!form) return false;
    if (name === 'issue') {
      const ok = !!form.querySelector('[name="issue"]:checked');
      setField('issue', ok);
      return ok;
    }
    const el = form.elements.namedItem(name);
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return false;
    const ok = checks[name]?.(el.value) ?? true;
    setField(name, ok, ok && el.value.trim().length > 0);
    return ok;
  }

  function validateAll() {
    const bad = ['name', 'email', 'business', 'issue', 'phone', 'website'].filter(
      (name) => !validate(name),
    );
    if (bad[0])
      $<HTMLElement>(`[data-field="${bad[0]}"] input, [data-field="${bad[0]}"] textarea`)?.focus();
    return bad.length === 0;
  }

  if (form) {
    for (const name of ['name', 'email', 'business', 'phone', 'website']) {
      const el = form.elements.namedItem(name);
      if (!(el instanceof HTMLInputElement)) continue;
      el.addEventListener('blur', () => {
        if (el.value.trim() || (['name', 'email', 'business'].includes(name) && el.dataset.touched))
          validate(name);
      });
      el.addEventListener('input', () => {
        el.dataset.touched = '1';
        if ($(`[data-field="${name}"]`)?.classList.contains('is-invalid')) validate(name);
      });
    }
    form.addEventListener('change', (event) => {
      if (event.target instanceof HTMLInputElement && event.target.name === 'issue')
        validate('issue');
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      void submit();
    });
  }

  function valueOf(name: string) {
    const el = form?.elements.namedItem(name);
    return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
      ? el.value.trim()
      : '';
  }

  function payload() {
    const issue = form?.querySelector<HTMLInputElement>('[name="issue"]:checked');
    return {
      start: state.slot?.start,
      end: state.slot?.end,
      timeZone: visitorTz,
      name: valueOf('name'),
      email: valueOf('email'),
      businessName: valueOf('business'),
      issue: issue?.value ?? '',
      problem: valueOf('details'),
      phone: valueOf('phone'),
      website: valueOf('website'),
      businessType: valueOf('type'),
      honeypot: valueOf('honeypot'),
      turnstileToken,
    };
  }

  function setSubmitting(on: boolean) {
    dlg.classList.toggle('is-submitting', on);
    if (!next) return;
    next.disabled = on;
    next.setAttribute('aria-busy', String(on));
    const label = next.querySelector('[data-label]');
    if (label) label.textContent = on ? 'Confirming…' : 'Confirm booking';
  }

  function nearby(iso: string, count: number) {
    const time = Date.parse(iso);
    return state.slots
      .filter((slot) => slot.start !== iso)
      .sort((a, b) => Math.abs(Date.parse(a.start) - time) - Math.abs(Date.parse(b.start) - time))
      .slice(0, count)
      .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  }

  async function submit() {
    if (!alertBox || !state.slot) return;
    alertBox.replaceChildren();
    if (!validateAll()) return;
    const mount = document.getElementById('bk-turnstile');
    // A mounted widget must yield a token. If Turnstile itself errors (wrong hostname in local
    // dev, for example), submit anyway and let the API accept or reject the request.
    if (mount?.childElementCount && !turnstileToken && !turnstileFailed) {
      mount.focus();
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload()),
      });
      const type = res.headers.get('content-type') ?? '';
      const data = type.includes('application/json')
        ? ((await res.json()) as Record<string, unknown>)
        : null;
      if (!res.ok || !data) {
        setSubmitting(false);
        if (res.status === 409) {
          const fresh = await fetchSlots();
          state.slots = Array.isArray(fresh)
            ? fresh
            : state.slots.filter((slot) => slot.start !== state.slot?.start);
          showTaken(Array.isArray(fresh) ? nearby(state.slot.start, 3) : []);
          return;
        }
        showError();
        return;
      }
      if (data.error === 'slot_taken') {
        setSubmitting(false);
        const fresh = await fetchSlots();
        state.slots = Array.isArray(fresh) ? fresh : [];
        showTaken(nearby(state.slot.start, 3));
        return;
      }
      setSubmitting(false);
      const email = $('[data-email]');
      if (email) email.textContent = valueOf('email');
      buildCalendarLinks({
        start: String(data.start ?? state.slot.start),
        end: String(data.end ?? state.slot.end),
        eventId: 'techshift-consultation',
        joinUrl: typeof data.meetLink === 'string' ? data.meetLink : undefined,
      });
      state.slots = state.slots.filter((slot) => slot.start !== state.slot?.start);
      go('done');
    } catch {
      setSubmitting(false);
      showError();
    }
  }

  function showTaken(alts: Slot[]) {
    if (!alertBox || !state.slot) return;
    const taken = state.slot;
    state.slots = state.slots.filter((slot) => slot.start !== taken.start);
    alertBox.replaceChildren();
    const box = document.createElement('div');
    box.className = 'alert alert--warn';
    box.setAttribute('role', 'alert');
    const heading = document.createElement('h3');
    heading.textContent = 'That time was just booked';
    const copy = document.createElement('p');
    copy.textContent = `Someone booked ${slotLabel(taken.start)} a moment ago. These nearby times are open, and your details are saved.`;
    const group = document.createElement('div');
    group.className = 'alt-times';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Nearby open times');
    for (const slot of alts) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'time';
      button.dataset.alt = slot.start;
      button.textContent = fmt(new Date(slot.start), {
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
      });
      group.append(button);
    }
    const change = document.createElement('button');
    change.type = 'button';
    change.className = 'linkbtn align-start';
    change.dataset.goto = 'pick';
    change.textContent = 'See all times';
    box.append(heading, copy, group, change);
    alertBox.append(box);
    state.slot = null;
    $$('.slot-sum [data-slot-label]').forEach((el) => {
      el.textContent = 'No time selected';
    });
    $$('.slot-sum [data-slot-tz]').forEach((el) => {
      el.textContent = 'Choose one of the open times above';
    });
    if (note) note.textContent = 'Pick another time';
    if (next) next.disabled = true;
    if (body) body.scrollTop = 0;
    alertBox.querySelector<HTMLElement>('[data-alt]')?.focus();
  }

  function showError() {
    if (!alertBox) return;
    alertBox.replaceChildren();
    const box = document.createElement('div');
    box.className = 'alert alert--err';
    box.setAttribute('role', 'alert');
    const heading = document.createElement('h3');
    heading.textContent = 'We could not confirm your booking';
    const copy = document.createElement('p');
    copy.append(
      'Nothing was booked, and your details are still here. Try again in a moment, or email us at ',
    );
    const mail = document.createElement('a');
    mail.href = `mailto:${contactEmail}?subject=Free%20consultation%20request`;
    mail.textContent = contactEmail;
    copy.append(mail, ' and we will find a time with you.');
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'btn btn--ghost btn--sm align-start';
    retry.dataset.retry = '';
    retry.textContent = 'Try again';
    const fallback = document.createElement('a');
    fallback.className = 'btn btn--ghost btn--sm align-start';
    fallback.href = fallbackUrl;
    fallback.textContent = 'Book a free consultation';
    box.append(heading, copy, retry, fallback);
    alertBox.append(box);
    if (body) body.scrollTop = 0;
    retry.focus();
  }

  function stamp(iso: string) {
    return iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  function buildCalendarLinks(res: {
    start: string;
    end: string;
    eventId: string;
    joinUrl?: string;
  }) {
    const title = 'Techshift free consultation';
    const details = res.joinUrl
      ? `Free online consultation with our team. Join: ${res.joinUrl}`
      : 'Free online consultation with our team. The link to join is in your email invitation.';
    const gcal = $<HTMLAnchorElement>('#gcal');
    if (gcal) {
      gcal.href = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${stamp(res.start)}/${stamp(res.end)}&details=${encodeURIComponent(details)}${res.joinUrl ? `&location=${encodeURIComponent(res.joinUrl)}` : ''}`;
    }
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Techshift//Booking//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${res.eventId}@techshift.ai`,
      `DTSTAMP:${stamp(new Date().toISOString())}`,
      `DTSTART:${stamp(res.start)}`,
      `DTEND:${stamp(res.end)}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${details.replace(/,/g, '\\,')}`,
      `LOCATION:${res.joinUrl ?? 'Online'}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const link = $<HTMLAnchorElement>('#ics');
    if (!link) return;
    if (link.dataset.url) URL.revokeObjectURL(link.dataset.url);
    link.dataset.url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    link.href = link.dataset.url;
  }

  grid?.addEventListener('click', (event) => {
    const button = (event.target as Element | null)?.closest<HTMLButtonElement>('.day');
    if (!button || button.getAttribute('aria-disabled') === 'true' || !button.dataset.key) return;
    selectDay(button.dataset.key);
    if (window.matchMedia('(max-width: 759px)').matches) {
      $('#times-wrap')?.scrollIntoView({
        block: 'start',
        behavior: reduceMotion.matches ? 'auto' : 'smooth',
      });
    }
  });
  grid?.addEventListener('keydown', (event) => {
    const button = (event.target as Element | null)?.closest<HTMLButtonElement>('.day');
    if (!button || !grid) return;
    const days = $$<HTMLButtonElement>('.day', grid);
    const index = days.indexOf(button);
    const move: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: 7,
      ArrowUp: -7,
    };
    let delta = move[event.key];
    if (event.key === 'Home') delta = -index;
    if (event.key === 'End') delta = days.length - 1 - index;
    if (delta === undefined) return;
    event.preventDefault();
    const target = days[Math.max(0, Math.min(days.length - 1, index + delta))];
    if (!target) return;
    days.forEach((day) => {
      day.tabIndex = -1;
    });
    target.tabIndex = 0;
    target.focus();
  });

  dlg.addEventListener('click', (event) => {
    const target = event.target as Element | null;
    const time = target?.closest<HTMLButtonElement>('.time[data-start]');
    const jump = target?.closest<HTMLButtonElement>('[data-jump]');
    const alt = target?.closest<HTMLButtonElement>('[data-alt]');
    const goto = target?.closest<HTMLButtonElement>('[data-goto]');
    if (time?.dataset.start) selectSlot(time.dataset.start);
    else if (jump?.dataset.jump) selectDay(jump.dataset.jump, true);
    else if (alt?.dataset.alt) {
      selectSlot(alt.dataset.alt);
      state.day = dayKey(new Date(alt.dataset.alt), visitorTz);
      alertBox?.replaceChildren();
      go('form', false);
      fillSlotLabels();
      next?.focus();
    } else if (
      goto?.dataset.goto === 'pick' ||
      goto?.dataset.goto === 'form' ||
      goto?.dataset.goto === 'done'
    ) {
      alertBox?.replaceChildren();
      renderCalendar();
      go(goto.dataset.goto);
    } else if (target?.closest('[data-retry]')) void submit();
    else if (target?.closest('[data-close]') || event.target === dlg) close();
  });

  next?.addEventListener('click', () => {
    if (state.step === 'pick' && state.slot) go('form');
    else if (state.step === 'form') void submit();
    else if (state.step === 'done') close();
  });

  dlg.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const focusable = $$<HTMLElement>(
      'a[href],button:not([disabled]),input:not([type="radio"]),input[type="radio"]:checked,textarea,select,[tabindex="0"]',
    ).filter(
      (el) =>
        el.getAttribute('tabindex') !== '-1' &&
        el.getClientRects().length > 0 &&
        !el.closest('[hidden]'),
    );
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  dlg.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });

  function open(opener: HTMLElement) {
    state.opener = opener;
    document.documentElement.style.overflow = 'hidden';
    dlg.showModal();
    if (state.step === 'done') resetFlow();
    const pending = state.slots.length ? Promise.resolve() : load();
    go(state.step, false);
    void pending.then(() => {
      if (!dlg.classList.contains('is-fallback')) go(state.step);
    });
  }

  function close() {
    if (!dlg.open) return;
    const finish = () => {
      dlg.classList.remove('is-closing');
      dlg.close();
      document.documentElement.style.overflow = '';
      state.opener?.focus();
    };
    if (reduceMotion.matches) {
      finish();
      return;
    }
    dlg.classList.add('is-closing');
    window.setTimeout(finish, 200);
  }

  function resetFlow() {
    state.slot = null;
    state.day = null;
    state.step = 'pick';
    form?.reset();
    alertBox?.replaceChildren();
    $$('.field').forEach((field) => field.classList.remove('is-invalid', 'is-valid'));
    turnstileToken = undefined;
    turnstileFailed = false;
    if (widgetId) turnstileApi()?.reset(widgetId);
  }

  document.addEventListener('click', (event) => {
    const trigger = (event.target as Element | null)?.closest<HTMLElement>('[data-book]');
    if (!trigger || dlg.contains(trigger)) return;
    event.preventDefault();
    open(trigger);
  });
}
