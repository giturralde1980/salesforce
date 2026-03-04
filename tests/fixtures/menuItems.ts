interface MenuItems {
  owner: string[];
  empleadoOther: string[];
  ownerOnlyItems: string[];
}

const MENU_ITEMS: MenuItems = {
  // Owner role - sees all 7 items
  owner: [
    'myOrders',
    'myInvoices',
    'payments',
    'myContracts',
    'customerService',
    'profile',
    'myEconsentPreferences'
  ],

  // Empleado Other role - sees only 2 items
  empleadoOther: [
    'profile',
    'myEconsentPreferences'
  ],

  // Items that should NOT be visible to Empleado Other
  ownerOnlyItems: [
    'myOrders',
    'myInvoices',
    'payments',
    'myContracts',
    'customerService'
  ]
};

export default MENU_ITEMS;
