export type MenuCategory = 'Signature Burgers' | 'Sides' | 'Drinks' | 'Desserts'

export type MenuItem = {
  id: string
  name: string
  category: MenuCategory
  description: string
  price: string
  image: string
  tag?: string
}

export const menuItems: MenuItem[] = [
  // Signature Burgers
  {
    id: 'ember-king',
    name: 'The Ember King',
    category: 'Signature Burgers',
    description: 'Twelve-hour hickory-smoked brisket patty, aged cheddar, candied bacon, pickled red onion, bourbon ember sauce on a charcoal brioche.',
    price: '$22',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&h=900&fit=crop',
    tag: 'House favourite',
  },
  {
    id: 'smoked-shorthorn',
    name: 'Smoked Shorthorn',
    category: 'Signature Burgers',
    description: 'Dry-aged shorthorn beef, slow-smoked over apple wood, gruyère, caramelized shallot, black-garlic mayo, sesame brioche.',
    price: '$19',
    image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=900&h=900&fit=crop',
  },
  {
    id: 'copper-bull',
    name: 'Copper Bull',
    category: 'Signature Burgers',
    description: 'Two thin smashed patties, double American cheese, smoked tomato relish, crisp shallot, copper sauce on a milk bun.',
    price: '$17',
    image: 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=900&h=900&fit=crop',
  },
  {
    id: 'ember-mushroom',
    name: 'Ember Mushroom',
    category: 'Signature Burgers',
    description: 'Hand-pressed king-oyster mushroom patty, smoked provolone, charred leek, miso aioli, toasted potato bun. Plant-based.',
    price: '$18',
    image: 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=900&h=900&fit=crop',
    tag: 'Plant-based',
  },
  {
    id: 'the-stoker',
    name: 'The Stoker',
    category: 'Signature Burgers',
    description: 'Wagyu blend, charred jalapeño, smoked gouda, crispy onion ring, ember mayo, demi-glaze on a pretzel bun. Heat scale 3/5.',
    price: '$24',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=900&h=900&fit=crop',
  },
  {
    id: 'cured-smokestack',
    name: 'Cured Smokestack',
    category: 'Signature Burgers',
    description: 'Triple-stack smashburger, house-cured pastrami, swiss, brown mustard slaw, dill pickle, rye-dusted brioche.',
    price: '$23',
    image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=900&h=900&fit=crop',
    tag: 'Limited run',
  },

  // Sides
  {
    id: 'duck-fat-fries',
    name: 'Duck-Fat Fries',
    category: 'Sides',
    description: 'Triple-cooked, finished in rendered duck fat, smoked sea salt, rosemary, charred-onion aioli for dipping.',
    price: '$8',
    image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=900&h=900&fit=crop',
  },
  {
    id: 'smoked-mac',
    name: 'Smoked Mac & Cheese',
    category: 'Sides',
    description: 'Cavatappi in three-cheese smoked béchamel, brown-butter breadcrumb, chive, served bubbling in cast-iron.',
    price: '$11',
    image: 'https://images.unsplash.com/photo-1543353071-10c8ba85a904?w=900&h=900&fit=crop',
  },
  {
    id: 'ember-onion-rings',
    name: 'Ember Onion Rings',
    category: 'Sides',
    description: 'Buttermilk-brined Vidalia, beer batter, smoked paprika, served with a smoked honey-mustard dip.',
    price: '$9',
    image: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=900&h=900&fit=crop',
  },
  {
    id: 'charred-broccolini',
    name: 'Charred Broccolini',
    category: 'Sides',
    description: 'Open-flame broccolini, lemon zest, chilli crisp, toasted almond, parmesan. A bright, blistered counterpoint.',
    price: '$10',
    image: 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=900&h=900&fit=crop',
  },

  // Drinks
  {
    id: 'smoked-old-fashioned',
    name: 'Smoked Old-Fashioned',
    category: 'Drinks',
    description: 'Bourbon, demerara, orange bitters, finished tableside under a hickory smoke cloche.',
    price: '$15',
    image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=900&h=900&fit=crop',
    tag: 'Signature pour',
  },
  {
    id: 'ember-lemonade',
    name: 'Ember Lemonade',
    category: 'Drinks',
    description: 'House lemonade, smoked rosemary syrup, charred orange. Non-alcoholic. Refreshing and just a little brooding.',
    price: '$7',
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=900&h=900&fit=crop',
  },
  {
    id: 'maple-cold-brew',
    name: 'Maple Cold Brew',
    category: 'Drinks',
    description: '24-hour cold brew, maple-smoked cream, sea salt, served over a single hand-cut clear ice block.',
    price: '$6',
    image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=900&h=900&fit=crop',
  },
  {
    id: 'house-craft-beer',
    name: 'House Craft Lager',
    category: 'Drinks',
    description: 'Local-brewed amber lager made for us. Toasted malt, gentle bitterness, made to chase a Stoker.',
    price: '$8',
    image: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=900&h=900&fit=crop',
  },

  // Desserts
  {
    id: 'smoked-chocolate-tart',
    name: 'Smoked Chocolate Tart',
    category: 'Desserts',
    description: 'Dark-chocolate ganache infused with apple-wood smoke, sea salt, candied pecan, crème fraîche quenelle.',
    price: '$12',
    image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=900&h=900&fit=crop',
  },
  {
    id: 'bourbon-pecan-pie',
    name: 'Bourbon Pecan Pie',
    category: 'Desserts',
    description: 'Toasted pecans, brown-butter custard, splash of bourbon, served warm with vanilla bean ice cream.',
    price: '$11',
    image: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=900&h=900&fit=crop',
  },
  {
    id: 'salted-caramel-shake',
    name: 'Salted Caramel Shake',
    category: 'Desserts',
    description: 'Hand-spun vanilla custard, smoked caramel ribbon, flaky sea salt, served in a frosted copper cup.',
    price: '$9',
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=900&h=900&fit=crop',
  },
]

export const categories: MenuCategory[] = ['Signature Burgers', 'Sides', 'Drinks', 'Desserts']
