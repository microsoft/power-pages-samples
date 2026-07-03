export type Offer = {
  id: string
  title: string
  subtitle: string
  description: string
  badge: string
  validity: string
  image: string
}

export const offers: Offer[] = [
  {
    id: 'firepit-thursdays',
    title: 'Firepit Thursdays',
    subtitle: 'Two burgers, one bottle, half off the second.',
    description:
      'Bring a partner, a friend, or a stranger. Order any two signature burgers between 5pm and 9pm on Thursdays and the second one is half price. Pair with a bottle of house lager for $12 more.',
    badge: 'Weekly',
    validity: 'Every Thursday · 5pm – 9pm',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1400&h=900&fit=crop',
  },
  {
    id: 'lunchbox-set',
    title: 'The Smokehouse Lunchbox',
    subtitle: 'A burger, a side, and a drink for $19.',
    description:
      'Pick any non-wagyu signature, choose duck-fat fries or charred broccolini, and add ember lemonade or maple cold brew. Lunchbox specials available weekdays.',
    badge: 'Weekday lunch',
    validity: 'Mon – Fri · 11:30am – 2:30pm',
    image: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=1400&h=900&fit=crop',
  },
  {
    id: 'weekend-feast',
    title: 'Weekend Feast for Four',
    subtitle: 'Four burgers, two big sides, dessert flight — $89.',
    description:
      'Built for the table. Four signatures of your choice (one wagyu upgrade included), one large mac, one large fries, plus a trio of chef-selected smoked desserts. Pre-order encouraged.',
    badge: 'Group',
    validity: 'Sat – Sun · All day',
    image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=1400&h=900&fit=crop',
  },
  {
    id: 'late-shift',
    title: 'Late Shift, Late Night',
    subtitle: '15% off after 10pm with a service-industry badge.',
    description:
      'For the cooks, the servers, the bartenders, the hospitality crews. Show us your latest pay stub or industry card after 10pm and get 15% off your entire bill, every night we are open.',
    badge: 'Hospitality',
    validity: 'Daily · 10pm – close',
    image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1400&h=900&fit=crop',
  },
  {
    id: 'birthday-month',
    title: 'Birthday Month',
    subtitle: 'A free signature burger any visit during your birthday month.',
    description:
      'Sign up to the Ember List and any visit during your birthday month earns you one complimentary signature burger (excluding wagyu) — no minimum order, no asterisks.',
    badge: 'Members',
    validity: 'Your birthday month · One visit',
    image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=1400&h=900&fit=crop',
  },
  {
    id: 'smoke-school',
    title: 'Smoke School Sundays',
    subtitle: '$45 — three-course tasting + how we smoke it.',
    description:
      'Sundays at 3pm our pitmaster opens the kitchen door. Three plates, a glass of smoked old-fashioned, a tour of the smokers, and the recipes to take home. Reserves needed. Limited to twelve guests.',
    badge: 'Experience',
    validity: 'Sundays · 3pm – 5pm · Reservation only',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1400&h=900&fit=crop',
  },
]
