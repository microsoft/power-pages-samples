export type Branch = {
  id: string
  city: string
  neighborhood: string
  address: string
  hours: string
  weekendHours: string
  phone: string
  directionsUrl: string
  image: string
  note: string
}

export const branches: Branch[] = [
  {
    id: 'brooklyn-flagship',
    city: 'Brooklyn',
    neighborhood: 'Williamsburg (Flagship)',
    address: '14 Ember Lane, Brooklyn, NY 11211',
    hours: 'Mon – Thu · 11:30am – 11pm',
    weekendHours: 'Fri – Sun · 11:30am – 1am',
    phone: '(212) 555-0140',
    directionsUrl: 'https://maps.google.com/?q=14+Ember+Lane+Brooklyn+NY',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1400&h=900&fit=crop',
    note: 'Where it all started. The original walk-up smokers still serve the brisket on weekends.',
  },
  {
    id: 'manhattan-loft',
    city: 'New York',
    neighborhood: 'Lower East Side',
    address: '278 Orchard St, New York, NY 10002',
    hours: 'Mon – Thu · 12pm – 12am',
    weekendHours: 'Fri – Sun · 12pm – 2am',
    phone: '(212) 555-0152',
    directionsUrl: 'https://maps.google.com/?q=278+Orchard+St+New+York+NY',
    image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1400&h=900&fit=crop',
    note: 'Open late. Cocktail-first room with a tighter menu and the only true tasting bar.',
  },
  {
    id: 'chicago-westloop',
    city: 'Chicago',
    neighborhood: 'West Loop',
    address: '925 W Fulton Market, Chicago, IL 60607',
    hours: 'Mon – Thu · 11am – 10pm',
    weekendHours: 'Fri – Sun · 11am – midnight',
    phone: '(312) 555-0177',
    directionsUrl: 'https://maps.google.com/?q=925+W+Fulton+Market+Chicago+IL',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1400&h=900&fit=crop',
    note: 'A converted meatpacking warehouse. Open kitchen, twin smokers, private dining for up to 40.',
  },
  {
    id: 'austin-eastside',
    city: 'Austin',
    neighborhood: 'East 6th',
    address: '1820 E 6th St, Austin, TX 78702',
    hours: 'Mon – Thu · 11:30am – 10pm',
    weekendHours: 'Fri – Sun · 11:30am – midnight',
    phone: '(512) 555-0166',
    directionsUrl: 'https://maps.google.com/?q=1820+E+6th+St+Austin+TX',
    image: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=1400&h=900&fit=crop',
    note: 'Patio-forward, live fire-pit on Friday and Saturday evenings, deepest bourbon list in the chain.',
  },
  {
    id: 'la-arts-district',
    city: 'Los Angeles',
    neighborhood: 'Arts District',
    address: '631 E 3rd St, Los Angeles, CA 90013',
    hours: 'Mon – Thu · 12pm – 11pm',
    weekendHours: 'Fri – Sun · 12pm – 1am',
    phone: '(213) 555-0189',
    directionsUrl: 'https://maps.google.com/?q=631+E+3rd+St+Los+Angeles+CA',
    image: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1400&h=900&fit=crop',
    note: 'Our newest. Loft ceilings, a vegetable-forward menu twist, and a quiet rooftop in season.',
  },
]
