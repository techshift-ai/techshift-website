/** Systems named on the homepage. Schema and llms.txt read this list. */
export const services = [
  {
    name: 'Digital front desk',
    description:
      'Answers calls, chats and messages, books appointments and handles customer questions, day and night.',
    path: '/#services',
  },
  {
    name: 'Automate the repetitive work',
    description: 'Connects the tools you already use and takes the manual steps off your team.',
    path: '/#services',
  },
  {
    name: 'Get found online',
    description:
      'A website that works for you and AI-managed social media, so you show up where customers look: search, AI answers and social.',
    path: '/#services',
  },
  {
    name: 'Booking system',
    description:
      'Every message answered and followed up until it books. Shown here for a restaurant.',
    path: '/#systems',
  },
  {
    name: 'AI customer service agent',
    description:
      'Takes calls and bookings over chat or voice, day and night. Shown here for a roofing company.',
    path: '/#systems',
  },
  {
    name: 'Automated customer follow-through',
    description:
      'After the job, it thanks the customer, asks for a review and schedules the next visit, so repeat business books itself. Shown here for HVAC.',
    path: '/#systems',
  },
] as const;
