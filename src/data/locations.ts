// Geo locations data from XMLRiver
// Users will see 'canonicalName', API calls use 'id' (loc parameter)
export interface Location {
  id: string;
  canonicalName: string;
}

export const locations: Location[] = [
  // Vietnam
  { id: "1028580", canonicalName: "Hanoi,Hanoi,Vietnam" },
  { id: "1028581", canonicalName: "Ho Chi Minh City,Ho Chi Minh City,Vietnam" },
  { id: "1028582", canonicalName: "Da Nang,Da Nang,Vietnam" },
  { id: "1028583", canonicalName: "Hai Phong,Hai Phong,Vietnam" },
  { id: "1028584", canonicalName: "Can Tho,Can Tho,Vietnam" },
  { id: "1028585", canonicalName: "Bien Hoa,Dong Nai,Vietnam" },
  { id: "1028586", canonicalName: "Nha Trang,Khanh Hoa,Vietnam" },
  { id: "1028587", canonicalName: "Hue,Thua Thien-Hue,Vietnam" },
  { id: "1028588", canonicalName: "Vung Tau,Ba Ria-Vung Tau,Vietnam" },
  { id: "1028589", canonicalName: "Quy Nhon,Binh Dinh,Vietnam" },
  // United States
  { id: "1014221", canonicalName: "New York,New York,United States" },
  { id: "1014222", canonicalName: "Los Angeles,California,United States" },
  { id: "1014223", canonicalName: "Chicago,Illinois,United States" },
  { id: "1014224", canonicalName: "Houston,Texas,United States" },
  { id: "1014225", canonicalName: "Phoenix,Arizona,United States" },
  { id: "1014226", canonicalName: "San Francisco,California,United States" },
  { id: "1014227", canonicalName: "Seattle,Washington,United States" },
  { id: "1014228", canonicalName: "Miami,Florida,United States" },
  { id: "1014229", canonicalName: "Boston,Massachusetts,United States" },
  { id: "1014230", canonicalName: "Denver,Colorado,United States" },
  // United Kingdom
  { id: "1006886", canonicalName: "London,England,United Kingdom" },
  { id: "1006887", canonicalName: "Manchester,England,United Kingdom" },
  { id: "1006888", canonicalName: "Birmingham,England,United Kingdom" },
  { id: "1006889", canonicalName: "Liverpool,England,United Kingdom" },
  { id: "1006890", canonicalName: "Edinburgh,Scotland,United Kingdom" },
  // Australia
  { id: "1000286", canonicalName: "Sydney,New South Wales,Australia" },
  { id: "1000287", canonicalName: "Melbourne,Victoria,Australia" },
  { id: "1000288", canonicalName: "Brisbane,Queensland,Australia" },
  { id: "1000289", canonicalName: "Perth,Western Australia,Australia" },
  { id: "1000290", canonicalName: "Adelaide,South Australia,Australia" },
  // Singapore
  { id: "1020954", canonicalName: "Singapore,Singapore" },
  // Japan
  { id: "1009282", canonicalName: "Tokyo,Tokyo,Japan" },
  { id: "1009283", canonicalName: "Osaka,Osaka,Japan" },
  { id: "1009284", canonicalName: "Yokohama,Kanagawa,Japan" },
  { id: "1009285", canonicalName: "Nagoya,Aichi,Japan" },
  { id: "1009286", canonicalName: "Kyoto,Kyoto,Japan" },
  // South Korea
  { id: "1011744", canonicalName: "Seoul,Seoul,South Korea" },
  { id: "1011745", canonicalName: "Busan,Busan,South Korea" },
  { id: "1011746", canonicalName: "Incheon,Incheon,South Korea" },
  // Germany
  { id: "1003854", canonicalName: "Berlin,Berlin,Germany" },
  { id: "1003855", canonicalName: "Munich,Bavaria,Germany" },
  { id: "1003856", canonicalName: "Hamburg,Hamburg,Germany" },
  { id: "1003857", canonicalName: "Frankfurt,Hesse,Germany" },
  // France
  { id: "1006094", canonicalName: "Paris,Ile-de-France,France" },
  { id: "1006095", canonicalName: "Lyon,Auvergne-Rhone-Alpes,France" },
  { id: "1006096", canonicalName: "Marseille,Provence-Alpes-Cote d'Azur,France" },
  // Thailand
  { id: "1023191", canonicalName: "Bangkok,Bangkok,Thailand" },
  { id: "1023192", canonicalName: "Chiang Mai,Chiang Mai,Thailand" },
  { id: "1023193", canonicalName: "Phuket,Phuket,Thailand" },
  // Malaysia
  { id: "1011033", canonicalName: "Kuala Lumpur,Kuala Lumpur,Malaysia" },
  { id: "1011034", canonicalName: "Penang,Penang,Malaysia" },
  { id: "1011035", canonicalName: "Johor Bahru,Johor,Malaysia" },
  // Indonesia
  { id: "1007776", canonicalName: "Jakarta,Jakarta,Indonesia" },
  { id: "1007777", canonicalName: "Surabaya,East Java,Indonesia" },
  { id: "1007778", canonicalName: "Bandung,West Java,Indonesia" },
  { id: "1007779", canonicalName: "Bali,Bali,Indonesia" },
];
