const customers = [
  { name: "Adrian Dela Cruz", contact: "0917-234-xxxx", address: "Blk 3 Lot 15, Brgy. San Jose, Calamba City, Laguna, xxxx",
    orders: [
      { name: "Tumbler (360ml)", category: "Mug & Tumbler", qty: 2, status: "Completed" },
      { name: "Ceramic Mug (11oz)", category: "Mug & Tumbler", qty: 5, status: "Pending" }
    ] },
  { name: "Aileen Santos", contact: "0908-451-xxxx", address: "#12 Purok 4, Brgy. Mabini, Los Baños, Laguna, xxxx",
    orders: [
      { name: "Tarpaulin (3x5ft)", category: "Printing", qty: 1, status: "Completed" }
    ] },
  { name: "Aljon Reyes", contact: "0921-778-xxxx", address: "Lot 8 Blk 2, Villa Alegre Subd., Sta. Rosa City, Laguna, xxxx",
    orders: [
      { name: "Tumbler (360ml)", category: "Mug & Tumbler", qty: 10, status: "Completed" },
      { name: "T-Shirt (Sublimation)", category: "Apparel", qty: 3, status: "Cancelled" }
    ] },
  { name: "Angela Bautista", contact: "0935-610-xxxx", address: "#45 Rizal Street, Brgy. Poblacion, Majayjay, Laguna, xxxx",
    orders: [
      { name: "Sticker Sheet (A4)", category: "Printing", qty: 20, status: "Completed" }
    ] },
  { name: "Anthony Garcia", contact: "0998-332-xxxx", address: "Blk 10 Lot 6, Greenfields Subd., Cabuyao City, Laguna, xxxx",
    orders: [
      { name: "Business Cards (100pcs)", category: "Printing", qty: 1, status: "Pending" }
    ] },
  { name: "Arlene Mendoza", contact: "0916-845-xxxx", address: "#23 Sampaguita St., Brgy. San Isidro, San Pablo City, Laguna, xxxx",
    orders: [
      { name: "Tumbler (360ml)", category: "Mug & Tumbler", qty: 4, status: "Completed" }
    ] },
  { name: "Benjamin Cruz", contact: "0947-129-xxxx", address: "Lot 14 Blk 5, Sunrise Village, Biñan City, Laguna, xxxx",
    orders: [
      { name: "Photo Print (4x6)", category: "Printing", qty: 50, status: "Completed" }
    ] },
  { name: "Bianca Navarro", contact: "0955-670-xxxx", address: "#9 Narra Street, Brgy. San Antonio, Calamba City, Laguna, xxxx",
    orders: [
      { name: "Ceramic Mug (11oz)", category: "Mug & Tumbler", qty: 6, status: "Pending" }
    ] },
  { name: "Carlo Ramos", contact: "0928-903-xxxx", address: "Blk 7 Lot 21, Monte Vista Subd., Bay, Laguna, xxxx",
    orders: [
      { name: "Tarpaulin (3x5ft)", category: "Printing", qty: 2, status: "Completed" }
    ] },
  { name: "Catherine Flores", contact: "0939-214-xxxx", address: "#18 Mabini St., Brgy. Sta. Cruz, Sta. Cruz, Laguna, xxxx",
    orders: [
      { name: "Tumbler (360ml)", category: "Mug & Tumbler", qty: 3, status: "Completed" }
    ] },
  { name: "Christian Lopez", contact: "0918-556-xxxx", address: "Lot 3 Blk 9, Woodlands Subd., Los Baños, Laguna, xxxx",
    orders: [
      { name: "T-Shirt (Sublimation)", category: "Apparel", qty: 8, status: "Completed" }
    ] },
  { name: "Claire Santiago", contact: "0907-781-xxxx", address: "#77 Burgos Street, Brgy. Banlic, Cabuyao City, Laguna, xxxx",
    orders: [
      { name: "Sticker Sheet (A4)", category: "Printing", qty: 15, status: "Pending" }
    ] },
  { name: "Daniel Villanueva", contact: "0926-440-xxxx", address: "Blk 2 Lot 11, Golden Heights, Calamba City, Laguna, xxxx",
    orders: [
      { name: "Business Cards (100pcs)", category: "Printing", qty: 2, status: "Completed" }
    ] },
  { name: "Diane Aquino", contact: "0940-302-xxxx", address: "#34 Quezon Avenue, Brgy. Pagsawitan, Sta. Cruz, Laguna, xxxx",
    orders: [
      { name: "Tumbler (360ml)", category: "Mug & Tumbler", qty: 7, status: "Completed" }
    ] },
  { name: "Dominic Torres", contact: "0931-875-xxxx", address: "Lot 6 Blk 4, Sunridge Village, San Pedro City, Laguna, xxxx",
    orders: [
      { name: "Photo Print (4x6)", category: "Printing", qty: 30, status: "Cancelled" }
    ] },
  { name: "Ella Castillo", contact: "0915-693-xxxx", address: "#19 Del Pilar St., Brgy. San Vicente, San Pablo City, Laguna, xxxx",
    orders: [
      { name: "Ceramic Mug (11oz)", category: "Mug & Tumbler", qty: 4, status: "Completed" }
    ] },
  { name: "Erika Lim", contact: "0932-119-xxxx", address: "Blk 5 Lot 8, Pineview Subd., Biñan City, Laguna, xxxx",
    orders: [
      { name: "Tarpaulin (3x5ft)", category: "Printing", qty: 1, status: "Pending" }
    ] },
  { name: "Francis Gonzales", contact: "0951-482-xxxx", address: "#61 Makiling St., Brgy. Batong Malake, Los Baños, Laguna, xxxx",
    orders: [
      { name: "Tumbler (360ml)", category: "Mug & Tumbler", qty: 2, status: "Completed" }
    ] },
  { name: "Gabriel Mendoza", contact: "0940-221-xxxx", address: "Lot 9 Blk 3, Riverside Homes, Cabuyao City, Laguna, xxxx",
    orders: [
      { name: "T-Shirt (Sublimation)", category: "Apparel", qty: 5, status: "Completed" }
    ] },
  { name: "Grace Dizon", contact: "0927-350-xxxx", address: "#27 Gomez Street, Brgy. Sta. Elena, Sta. Cruz, Laguna, xxxx",
    orders: [
      { name: "Sticker Sheet (A4)", category: "Printing", qty: 10, status: "Completed" }
    ] }
];
 
 