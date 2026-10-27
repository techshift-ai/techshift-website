/**
 * Homepage behaviour CSS cannot do on its own: the menu, scroll reveals, hero depth,
 * the systems story, and one-open accordions. Motion stays in site.css.
 */
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
const fine = window.matchMedia('(hover: hover) and (pointer: fine)');

document.documentElement.classList.add('js');

const menuButton = document.querySelector<HTMLButtonElement>('.menu-btn');
const nav = document.getElementById('site-nav');
if (menuButton && nav) {
  const setMenu = (open: boolean) => {
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    nav.classList.toggle('is-open', open);
  };
  menuButton.addEventListener('click', () =>
    setMenu(menuButton.getAttribute('aria-expanded') !== 'true'),
  );
  nav.addEventListener('click', (event) => {
    if ((event.target as Element | null)?.closest('a')) setMenu(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      menuButton.focus();
    }
  });
}

const revealItems = document.querySelectorAll<HTMLElement>('[data-reveal]');
if ('IntersectionObserver' in window && !reduce.matches) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.1 },
  );
  revealItems.forEach((el) => io.observe(el));
} else {
  revealItems.forEach((el) => el.classList.add('is-in'));
}

const hero = document.querySelector<HTMLElement>('.hero');
if (hero) {
  const ready = () => hero.classList.add('is-ready');
  if (document.fonts) void document.fonts.ready.then(ready);
  else ready();

  const hv = document.getElementById('hv');
  if (hv) {
    let px = 0;
    let py = 0;
    let queued = false;
    const paint = () => {
      queued = false;
      hv.style.setProperty('--px', px.toFixed(3));
      hv.style.setProperty('--py', py.toFixed(3));
    };
    hero.addEventListener('pointermove', (event) => {
      if (!fine.matches || reduce.matches || event.pointerType !== 'mouse') return;
      const rect = hero.getBoundingClientRect();
      px = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1));
      py = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1));
      if (!queued) {
        queued = true;
        requestAnimationFrame(paint);
      }
    });
    hero.addEventListener('pointerleave', () => {
      px = 0;
      py = 0;
      if (!queued) {
        queued = true;
        requestAnimationFrame(paint);
      }
    });
  }
}

document.querySelectorAll<HTMLElement>('.magnet-zone').forEach((zone) => {
  const button = zone.querySelector<HTMLElement>('.magnet');
  if (!button) return;
  zone.addEventListener('pointermove', (event) => {
    if (!fine.matches || reduce.matches || event.pointerType !== 'mouse') return;
    const rect = button.getBoundingClientRect();
    const dx = (event.clientX - (rect.left + rect.width / 2)) / rect.width;
    const dy = (event.clientY - (rect.top + rect.height / 2)) / rect.height;
    button.style.setProperty('--mx', `${(dx * 12).toFixed(1)}px`);
    button.style.setProperty('--my', `${(dy * 10).toFixed(1)}px`);
  });
  zone.addEventListener('pointerleave', () => {
    button.style.setProperty('--mx', '0px');
    button.style.setProperty('--my', '0px');
  });
});

const header = document.querySelector('.site-header');
const live = document.getElementById('live');
const stepsEl = document.querySelector('.story-steps');
if (live && stepsEl && header) {
  const steps = stepsEl.querySelectorAll<HTMLElement>('li');
  const nodes = live.querySelectorAll<HTMLElement>('[data-s]');
  const typing = live.querySelector<HTMLElement>('.typing');
  const statusEl = document.getElementById('live-status');
  const clockEl = document.getElementById('live-clock');
  const threadEl = document.getElementById('thread');
  const status: Record<string, [string, string][]> = {
    with: [
      ['Waiting', ''],
      ['New message', ''],
      ['Answered', ''],
      ['Following up', 'cau'],
      ['Following up', 'cau'],
      ['Reserved', 'pos'],
      ['Reserved', 'pos'],
    ],
    without: [
      ['Waiting', ''],
      ['New message', ''],
      ['No reply', 'cau'],
      ['No reply', 'cau'],
      ['Gone quiet', 'neg'],
      ['Lost', 'neg'],
      ['Lost', 'neg'],
    ],
  };
  let stage = -1;
  let mode = 'with';
  let typeTimer = 0;

  const apply = (next: number, force = false) => {
    if (next === stage && !force) return;
    const forward = next > stage;
    stage = next;
    nodes.forEach((el) => {
      const on = next >= Number(el.getAttribute('data-s'));
      if (on && !el.classList.contains('on')) {
        el.classList.add('on');
        if (
          el.hasAttribute('data-typing') &&
          forward &&
          !force &&
          !reduce.matches &&
          mode === 'with' &&
          typing
        ) {
          window.clearTimeout(typeTimer);
          el.classList.add('wait');
          typing.classList.add('on');
          typeTimer = window.setTimeout(() => {
            el.classList.remove('wait');
            typing.classList.remove('on');
          }, 700);
        }
      } else if (!on && el.classList.contains('on')) {
        el.classList.remove('on', 'wait');
        if (el.hasAttribute('data-typing')) typing?.classList.remove('on');
      }
    });
    const label = status[mode]?.[next];
    if (statusEl && label) {
      statusEl.textContent = label[0];
      statusEl.className = 'chip-d' + (label[1] ? ` ${label[1]}` : '');
    }
    if (clockEl) {
      clockEl.textContent =
        next < 3 ? '11:48 PM' : next < 4 ? '9:00 AM' : mode === 'with' ? '9:04 AM' : '9:30 AM';
    }
    const current = next >= 6 ? 3 : next >= 3 ? 2 : next >= 1 ? 1 : 0;
    steps.forEach((li) => {
      if (Number(li.dataset.step) === current && !reduce.matches)
        li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');
    });
  };

  const story = () => {
    const vh = window.innerHeight;
    const rect = live.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (vh * 0.8 - rect.top) / (vh * 0.62)));
    apply(Math.min(6, Math.floor(progress * 7)));
  };
  const layout = () => {
    threadEl?.classList.toggle('is-static', reduce.matches);
    stepsEl.classList.toggle('is-static', reduce.matches);
    if (reduce.matches) apply(6, true);
    else story();
  };
  live.querySelectorAll<HTMLButtonElement>('[data-mode-btn]').forEach((button) => {
    button.addEventListener('click', () => {
      mode = button.getAttribute('data-mode-btn') ?? 'with';
      live.setAttribute('data-mode', mode);
      live.querySelectorAll('[data-mode-btn]').forEach((other) => {
        other.setAttribute('aria-pressed', String(other === button));
      });
      window.clearTimeout(typeTimer);
      typing?.classList.remove('on');
      nodes.forEach((el) => el.classList.remove('on', 'wait'));
      const current = stage;
      stage = -1;
      apply(current, true);
    });
  });
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      header.classList.toggle('is-stuck', window.scrollY > 4);
      if (!reduce.matches) story();
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', layout, { passive: true });
  reduce.addEventListener('change', layout);
  layout();
  onScroll();
} else if (header) {
  window.addEventListener('scroll', () => header.classList.toggle('is-stuck', window.scrollY > 4), {
    passive: true,
  });
}

document.querySelectorAll<HTMLElement>('[data-acc-group]').forEach((group) => {
  const buttons = group.querySelectorAll<HTMLButtonElement>('[data-acc]');
  const setOpen = (button: HTMLButtonElement, open: boolean) => {
    button.setAttribute('aria-expanded', String(open));
    button.closest('[data-acc-item]')?.classList.toggle('is-open', open);
  };
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') !== 'true';
      if (open) {
        buttons.forEach((other) => {
          if (other !== button && other.getAttribute('aria-expanded') === 'true')
            setOpen(other, false);
        });
      }
      setOpen(button, open);
    });
  });
});
