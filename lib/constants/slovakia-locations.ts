/**
 * Kompletná hierarchická štruktúra Slovenska
 * Kraj → Okres → Mestá/Obce
 * 
 * Zdroj: Štatistický úrad SR
 */

export interface Location {
  id: string;
  name: string;
  slug: string;
  type: "region" | "district" | "city" | "town" | "village";
}

export interface District extends Location {
  type: "district";
  regionId: string;
  cities: string[]; // Názvy miest a obcí v okrese
}

export interface Region extends Location {
  type: "region";
  districts: string[]; // ID okresov
}

// ============================================
// 8 KRAJOV SLOVENSKA
// ============================================
export const REGIONS: Record<string, Region> = {
  BA: {
    id: "BA",
    name: "Bratislavský kraj",
    slug: "bratislavsky",
    type: "region",
    districts: ["BA1", "BA2", "BA3", "BA4", "BA5", "MA", "PE_BA", "SC"],
  },
  TT: {
    id: "TT",
    name: "Trnavský kraj",
    slug: "trnavsky",
    type: "region",
    districts: ["DS", "GA", "HC", "PN", "SE", "SK", "TT_D"],
  },
  TN: {
    id: "TN",
    name: "Trenčiansky kraj",
    slug: "trenciansky",
    type: "region",
    districts: ["BN", "IL", "MY", "NM", "PE_TN", "PB", "PU", "TN_D"],
  },
  NR: {
    id: "NR",
    name: "Nitriansky kraj",
    slug: "nitriansky",
    type: "region",
    districts: ["KN", "LV", "NR_D", "NZ", "SA", "TO", "ZM"],
  },
  ZA: {
    id: "ZA",
    name: "Žilinský kraj",
    slug: "zilinsky",
    type: "region",
    districts: ["BY", "CA", "DK", "KM", "LM", "MT", "NO", "RK", "TR", "TS", "ZA_D"],
  },
  BB: {
    id: "BB",
    name: "Banskobystrický kraj",
    slug: "banskobystricky",
    type: "region",
    districts: ["BB_D", "BR", "BS", "DT", "KA", "LC", "PT", "RA", "RS", "VK", "ZC", "ZH", "ZV"],
  },
  PO: {
    id: "PO",
    name: "Prešovský kraj",
    slug: "presovsky",
    type: "region",
    districts: ["BJ", "HE", "KK", "LE", "ML", "PO_D", "PP", "SB", "SK_PO", "SL", "SN", "SP", "SV", "VT"],
  },
  KE: {
    id: "KE",
    name: "Košický kraj",
    slug: "kosicky",
    type: "region",
    districts: ["GE", "KE1", "KE2", "KE3", "KE4", "KS", "MI", "RV", "SO", "SP_KE", "TV"],
  },
};

// ============================================
// 79 OKRESOV SLOVENSKA s mestami
// ============================================
export const DISTRICTS: Record<string, District> = {
  // BRATISLAVSKÝ KRAJ
  BA1: {
    id: "BA1",
    name: "Bratislava I",
    slug: "bratislava-1",
    type: "district",
    regionId: "BA",
    cities: ["Bratislava - Staré Mesto"],
  },
  BA2: {
    id: "BA2",
    name: "Bratislava II",
    slug: "bratislava-2",
    type: "district",
    regionId: "BA",
    cities: ["Bratislava - Ružinov", "Bratislava - Vrakuňa", "Bratislava - Podunajské Biskupice"],
  },
  BA3: {
    id: "BA3",
    name: "Bratislava III",
    slug: "bratislava-3",
    type: "district",
    regionId: "BA",
    cities: ["Bratislava - Nové Mesto", "Bratislava - Rača", "Bratislava - Vajnory"],
  },
  BA4: {
    id: "BA4",
    name: "Bratislava IV",
    slug: "bratislava-4",
    type: "district",
    regionId: "BA",
    cities: ["Bratislava - Karlova Ves", "Bratislava - Dúbravka", "Bratislava - Lamač", "Bratislava - Devín", "Bratislava - Devínska Nová Ves", "Bratislava - Záhorská Bystrica"],
  },
  BA5: {
    id: "BA5",
    name: "Bratislava V",
    slug: "bratislava-5",
    type: "district",
    regionId: "BA",
    cities: ["Bratislava - Petržalka", "Bratislava - Jarovce", "Bratislava - Rusovce", "Bratislava - Čunovo"],
  },
  MA: {
    id: "MA",
    name: "Malacky",
    slug: "malacky",
    type: "district",
    regionId: "BA",
    cities: ["Malacky", "Stupava", "Veľké Leváre", "Gajary", "Záhorská Ves", "Plavecký Štvrtok", "Láb", "Jakubov"],
  },
  PE_BA: {
    id: "PE_BA",
    name: "Pezinok",
    slug: "pezinok",
    type: "district",
    regionId: "BA",
    cities: ["Pezinok", "Modra", "Svätý Jur", "Limbach", "Slovenský Grob", "Viničné", "Vinosady", "Šenkvice"],
  },
  SC: {
    id: "SC",
    name: "Senec",
    slug: "senec",
    type: "district",
    regionId: "BA",
    cities: ["Senec", "Bernolákovo", "Ivanka pri Dunaji", "Chorvátsky Grob", "Most pri Bratislave", "Veľký Biel", "Nová Dedinka"],
  },

  // TRNAVSKÝ KRAJ
  DS: {
    id: "DS",
    name: "Dunajská Streda",
    slug: "dunajska-streda",
    type: "district",
    regionId: "TT",
    cities: ["Dunajská Streda", "Šamorín", "Veľký Meder", "Gabčíkovo", "Lehnice", "Šaľa", "Čilistov"],
  },
  GA: {
    id: "GA",
    name: "Galanta",
    slug: "galanta",
    type: "district",
    regionId: "TT",
    cities: ["Galanta", "Sereď", "Sládkovičovo", "Kajal", "Dolná Streda", "Pata", "Tomášikovo"],
  },
  HC: {
    id: "HC",
    name: "Hlohovec",
    slug: "hlohovec",
    type: "district",
    regionId: "TT",
    cities: ["Hlohovec", "Leopoldov", "Bojničky", "Červeník", "Dolné Trhovište", "Jalšové"],
  },
  PN: {
    id: "PN",
    name: "Piešťany",
    slug: "piestany",
    type: "district",
    regionId: "TT",
    cities: ["Piešťany", "Vrbové", "Moravany nad Váhom", "Banka", "Drahovce", "Ducové", "Hubina"],
  },
  SE: {
    id: "SE",
    name: "Senica",
    slug: "senica",
    type: "district",
    regionId: "TT",
    cities: ["Senica", "Holíč", "Skalica", "Gbely", "Šaštín-Stráže", "Borský Mikuláš", "Sekule"],
  },
  SK: {
    id: "SK",
    name: "Skalica",
    slug: "skalica",
    type: "district",
    regionId: "TT",
    cities: ["Skalica", "Holíč", "Gbely", "Kopčany", "Radimov", "Vrádište", "Mokrý Háj"],
  },
  TT_D: {
    id: "TT_D",
    name: "Trnava",
    slug: "trnava",
    type: "district",
    regionId: "TT",
    cities: ["Trnava", "Smolenice", "Bučany", "Cífer", "Dolné Orešany", "Majcichov", "Ružindol", "Suchá nad Parnou", "Trstín", "Zeleneč", "Biely Kostol"],
  },

  // TRENČIANSKY KRAJ
  BN: {
    id: "BN",
    name: "Bánovce nad Bebravou",
    slug: "banovce-nad-bebravou",
    type: "district",
    regionId: "TN",
    cities: ["Bánovce nad Bebravou", "Uhrovec", "Veľké Chlievany", "Malé Chlievany", "Dežerice"],
  },
  IL: {
    id: "IL",
    name: "Ilava",
    slug: "ilava",
    type: "district",
    regionId: "TN",
    cities: ["Ilava", "Dubnica nad Váhom", "Nová Dubnica", "Pruské", "Ladce", "Bolešov", "Košeca"],
  },
  MY: {
    id: "MY",
    name: "Myjava",
    slug: "myjava",
    type: "district",
    regionId: "TN",
    cities: ["Myjava", "Brezová pod Bradlom", "Stará Turá", "Poriadie", "Rudník", "Vrbovce"],
  },
  NM: {
    id: "NM",
    name: "Nové Mesto nad Váhom",
    slug: "nove-mesto-nad-vahom",
    type: "district",
    regionId: "TN",
    cities: ["Nové Mesto nad Váhom", "Stará Turá", "Čachtice", "Trenčianske Stankovce", "Moravské Lieskové", "Beckov"],
  },
  PE_TN: {
    id: "PE_TN",
    name: "Partizánske",
    slug: "partizanske",
    type: "district",
    regionId: "TN",
    cities: ["Partizánske", "Bošany", "Brodzany", "Veľké Uherce", "Malé Uherce", "Nadlice"],
  },
  PB: {
    id: "PB",
    name: "Považská Bystrica",
    slug: "povazska-bystrica",
    type: "district",
    regionId: "TN",
    cities: ["Považská Bystrica", "Púchov", "Lednica", "Dolná Mariková", "Horná Mariková", "Záriečie"],
  },
  PU: {
    id: "PU",
    name: "Púchov",
    slug: "puchov",
    type: "district",
    regionId: "TN",
    cities: ["Púchov", "Lednické Rovne", "Beluša", "Lazy pod Makytou", "Dohňany", "Hoštín"],
  },
  TN_D: {
    id: "TN_D",
    name: "Trenčín",
    slug: "trencin",
    type: "district",
    regionId: "TN",
    cities: ["Trenčín", "Nemšová", "Drietoma", "Skalka nad Váhom", "Zamarovce", "Opatová", "Trenčianska Turná", "Trenčianske Teplice"],
  },

  // NITRIANSKY KRAJ
  KN: {
    id: "KN",
    name: "Komárno",
    slug: "komarno",
    type: "district",
    regionId: "NR",
    cities: ["Komárno", "Hurbanovo", "Kolárovo", "Zlatná na Ostrove", "Moča", "Svätý Peter", "Iža"],
  },
  LV: {
    id: "LV",
    name: "Levice",
    slug: "levice",
    type: "district",
    regionId: "NR",
    cities: ["Levice", "Želiezovce", "Tlmače", "Kalná nad Hronom", "Podlužany", "Bátovce", "Pukanec"],
  },
  NR_D: {
    id: "NR_D",
    name: "Nitra",
    slug: "nitra",
    type: "district",
    regionId: "NR",
    cities: ["Nitra", "Vráble", "Zlaté Moravce", "Mojmírovce", "Cabaj-Čápor", "Čakajovce", "Ivanka pri Nitre", "Lužianky"],
  },
  NZ: {
    id: "NZ",
    name: "Nové Zámky",
    slug: "nove-zamky",
    type: "district",
    regionId: "NR",
    cities: ["Nové Zámky", "Štúrovo", "Dvory nad Žitavou", "Šurany", "Palárikovo", "Tvrdošovce", "Gbelce"],
  },
  SA: {
    id: "SA",
    name: "Šaľa",
    slug: "sala",
    type: "district",
    regionId: "NR",
    cities: ["Šaľa", "Vlčany", "Tešedíkovo", "Diakovce", "Žihárec", "Hájske"],
  },
  TO: {
    id: "TO",
    name: "Topoľčany",
    slug: "topolcany",
    type: "district",
    regionId: "NR",
    cities: ["Topoľčany", "Bánovce nad Bebravou", "Práznovce", "Solčany", "Urmince", "Veľké Ripňany"],
  },
  ZM: {
    id: "ZM",
    name: "Zlaté Moravce",
    slug: "zlate-moravce",
    type: "district",
    regionId: "NR",
    cities: ["Zlaté Moravce", "Vráble", "Topoľčianky", "Hostie", "Tesárske Mlyňany", "Čaradice"],
  },

  // ŽILINSKÝ KRAJ
  BY: {
    id: "BY",
    name: "Bytča",
    slug: "bytca",
    type: "district",
    regionId: "ZA",
    cities: ["Bytča", "Hričovské Podhradie", "Kotešová", "Petrovice", "Štiavnik", "Súľov-Hradná"],
  },
  CA: {
    id: "CA",
    name: "Čadca",
    slug: "cadca",
    type: "district",
    regionId: "ZA",
    cities: ["Čadca", "Turzovka", "Krásno nad Kysucou", "Korňa", "Oščadnica", "Skalité", "Zákopčie", "Makov"],
  },
  DK: {
    id: "DK",
    name: "Dolný Kubín",
    slug: "dolny-kubin",
    type: "district",
    regionId: "ZA",
    cities: ["Dolný Kubín", "Vyšný Kubín", "Párnica", "Istebné", "Veličná", "Zázrivá", "Malatiná"],
  },
  KM: {
    id: "KM",
    name: "Kysucké Nové Mesto",
    slug: "kysucke-nove-mesto",
    type: "district",
    regionId: "ZA",
    cities: ["Kysucké Nové Mesto", "Ochodnica", "Rudina", "Rudinka", "Nesluša", "Lodno"],
  },
  LM: {
    id: "LM",
    name: "Liptovský Mikuláš",
    slug: "liptovsky-mikulas",
    type: "district",
    regionId: "ZA",
    cities: ["Liptovský Mikuláš", "Liptovský Hrádok", "Ružomberok", "Východná", "Závažná Poruba", "Liptovská Teplá", "Demänovská Dolina"],
  },
  MT: {
    id: "MT",
    name: "Martin",
    slug: "martin",
    type: "district",
    regionId: "ZA",
    cities: ["Martin", "Vrútky", "Turčianske Teplice", "Sučany", "Príbovce", "Turany", "Bystrička"],
  },
  NO: {
    id: "NO",
    name: "Námestovo",
    slug: "namestovo",
    type: "district",
    regionId: "ZA",
    cities: ["Námestovo", "Trstená", "Tvrdošín", "Oravská Lesná", "Oravská Polhora", "Rabča", "Sihelné"],
  },
  RK: {
    id: "RK",
    name: "Ružomberok",
    slug: "ruzomberok",
    type: "district",
    regionId: "ZA",
    cities: ["Ružomberok", "Likavka", "Liptovské Sliače", "Hubová", "Liptovská Lúžna", "Liptovské Revúce"],
  },
  TR: {
    id: "TR",
    name: "Turčianske Teplice",
    slug: "turcianske-teplice",
    type: "district",
    regionId: "ZA",
    cities: ["Turčianske Teplice", "Mošovce", "Sklené", "Turček", "Dubové", "Rakša"],
  },
  TS: {
    id: "TS",
    name: "Tvrdošín",
    slug: "tvrdosin",
    type: "district",
    regionId: "ZA",
    cities: ["Tvrdošín", "Trstená", "Nižná", "Oravský Biely Potok", "Habovka", "Zuberec"],
  },
  ZA_D: {
    id: "ZA_D",
    name: "Žilina",
    slug: "zilina",
    type: "district",
    regionId: "ZA",
    cities: ["Žilina", "Rajecké Teplice", "Rajec", "Lietavská Lúčka", "Višňové", "Terchová", "Varín", "Strečno"],
  },

  // BANSKOBYSTRICKÝ KRAJ
  BB_D: {
    id: "BB_D",
    name: "Banská Bystrica",
    slug: "banska-bystrica",
    type: "district",
    regionId: "BB",
    cities: ["Banská Bystrica", "Badín", "Hronsek", "Malachov", "Králiky", "Selce", "Slovenská Ľupča", "Tajov"],
  },
  BR: {
    id: "BR",
    name: "Brezno",
    slug: "brezno",
    type: "district",
    regionId: "BB",
    cities: ["Brezno", "Čierny Balog", "Heľpa", "Pohorelá", "Šumiac", "Telgárt", "Závadka nad Hronom"],
  },
  BS: {
    id: "BS",
    name: "Banská Štiavnica",
    slug: "banska-stiavnica",
    type: "district",
    regionId: "BB",
    cities: ["Banská Štiavnica", "Banský Studenec", "Hodruša-Hámre", "Štiavnické Bane", "Svätý Anton"],
  },
  DT: {
    id: "DT",
    name: "Detva",
    slug: "detva",
    type: "district",
    regionId: "BB",
    cities: ["Detva", "Hriňová", "Dúbravy", "Korytárky", "Podkriváň", "Stožok", "Vígľaš"],
  },
  KA: {
    id: "KA",
    name: "Krupina",
    slug: "krupina",
    type: "district",
    regionId: "BB",
    cities: ["Krupina", "Dudince", "Hontianske Nemce", "Ladzany", "Senohrad"],
  },
  LC: {
    id: "LC",
    name: "Lučenec",
    slug: "lucenec",
    type: "district",
    regionId: "BB",
    cities: ["Lučenec", "Fiľakovo", "Halič", "Trebeľovce", "Tomášovce", "Lovinobaňa", "Cinobaňa"],
  },
  PT: {
    id: "PT",
    name: "Poltár",
    slug: "poltar",
    type: "district",
    regionId: "BB",
    cities: ["Poltár", "Hrachovo", "Málinec", "Ozdín", "Breznička", "Uhorské"],
  },
  RA: {
    id: "RA",
    name: "Revúca",
    slug: "revuca",
    type: "district",
    regionId: "BB",
    cities: ["Revúca", "Jelšava", "Muráň", "Ratková", "Sirk", "Magnezitovce"],
  },
  RS: {
    id: "RS",
    name: "Rimavská Sobota",
    slug: "rimavska-sobota",
    type: "district",
    regionId: "BB",
    cities: ["Rimavská Sobota", "Hnúšťa", "Tisovec", "Jesenské", "Ožďany", "Klenovec", "Rimavská Seč"],
  },
  VK: {
    id: "VK",
    name: "Veľký Krtíš",
    slug: "velky-krtis",
    type: "district",
    regionId: "BB",
    cities: ["Veľký Krtíš", "Modrý Kameň", "Dolná Strehová", "Nenince", "Olováry", "Príbelce"],
  },
  ZC: {
    id: "ZC",
    name: "Žarnovica",
    slug: "zarnovica",
    type: "district",
    regionId: "BB",
    cities: ["Žarnovica", "Nová Baňa", "Hronský Beňadik", "Tekovská Breznica", "Brehy"],
  },
  ZH: {
    id: "ZH",
    name: "Žiar nad Hronom",
    slug: "ziar-nad-hronom",
    type: "district",
    regionId: "BB",
    cities: ["Žiar nad Hronom", "Kremnica", "Nová Baňa", "Lutila", "Lovča", "Slaská", "Dolná Ždaňa"],
  },
  ZV: {
    id: "ZV",
    name: "Zvolen",
    slug: "zvolen",
    type: "district",
    regionId: "BB",
    cities: ["Zvolen", "Sliač", "Môťová", "Zvolenská Slatina", "Budča", "Lukavica", "Očová"],
  },

  // PREŠOVSKÝ KRAJ
  BJ: {
    id: "BJ",
    name: "Bardejov",
    slug: "bardejov",
    type: "district",
    regionId: "PO",
    cities: ["Bardejov", "Bardejovské Kúpele", "Zborov", "Gaboltov", "Kurima", "Raslavice", "Hertník"],
  },
  HE: {
    id: "HE",
    name: "Humenné",
    slug: "humenne",
    type: "district",
    regionId: "PO",
    cities: ["Humenné", "Medzilaborce", "Snina", "Kamenica nad Cirochou", "Jasenov", "Lackovce"],
  },
  KK: {
    id: "KK",
    name: "Kežmarok",
    slug: "kezmarok",
    type: "district",
    regionId: "PO",
    cities: ["Kežmarok", "Spišská Belá", "Podolínec", "Ľubica", "Vrbov", "Rakúsy", "Jurské"],
  },
  LE: {
    id: "LE",
    name: "Levoča",
    slug: "levoca",
    type: "district",
    regionId: "PO",
    cities: ["Levoča", "Spišské Podhradie", "Spišský Hrhov", "Jablonov", "Torysky", "Dravce"],
  },
  ML: {
    id: "ML",
    name: "Medzilaborce",
    slug: "medzilaborce",
    type: "district",
    regionId: "PO",
    cities: ["Medzilaborce", "Habura", "Krásny Brod", "Čertižné", "Výrava", "Rokytov"],
  },
  PO_D: {
    id: "PO_D",
    name: "Prešov",
    slug: "presov",
    type: "district",
    regionId: "PO",
    cities: ["Prešov", "Veľký Šariš", "Lipany", "Sabinov", "Svinia", "Terňa", "Kapušany", "Ľubotice"],
  },
  PP: {
    id: "PP",
    name: "Poprad",
    slug: "poprad",
    type: "district",
    regionId: "PO",
    cities: ["Poprad", "Svit", "Vysoké Tatry", "Spišská Sobota", "Matejovce", "Veľká", "Štrbské Pleso", "Tatranská Lomnica"],
  },
  SB: {
    id: "SB",
    name: "Sabinov",
    slug: "sabinov",
    type: "district",
    regionId: "PO",
    cities: ["Sabinov", "Lipany", "Červenica", "Drienica", "Dubovica", "Olejníkov", "Pečovská Nová Ves"],
  },
  SK_PO: {
    id: "SK_PO",
    name: "Svidník",
    slug: "svidnik",
    type: "district",
    regionId: "PO",
    cities: ["Svidník", "Stropkov", "Giraltovce", "Ladomirová", "Nižný Mirošov", "Vyšný Mirošov"],
  },
  SL: {
    id: "SL",
    name: "Stará Ľubovňa",
    slug: "stara-lubovna",
    type: "district",
    regionId: "PO",
    cities: ["Stará Ľubovňa", "Podolínec", "Hniezdne", "Jakubany", "Nová Ľubovňa", "Forbasy"],
  },
  SN: {
    id: "SN",
    name: "Snina",
    slug: "snina",
    type: "district",
    regionId: "PO",
    cities: ["Snina", "Stakčín", "Ubľa", "Ulič", "Kolonica", "Runina", "Kalná Roztoka"],
  },
  SP: {
    id: "SP",
    name: "Stropkov",
    slug: "stropkov",
    type: "district",
    regionId: "PO",
    cities: ["Stropkov", "Brusnica", "Chotča", "Tisinec", "Tokajík", "Turany nad Ondavou"],
  },
  SV: {
    id: "SV",
    name: "Svidník",
    slug: "svidnik-okres",
    type: "district",
    regionId: "PO",
    cities: ["Svidník", "Giraltovce", "Ladomirová", "Stročín", "Šarišský Štiavnik", "Vyšný Orlík"],
  },
  VT: {
    id: "VT",
    name: "Vranov nad Topľou",
    slug: "vranov-nad-toplou",
    type: "district",
    regionId: "PO",
    cities: ["Vranov nad Topľou", "Hanušovce nad Topľou", "Čaklov", "Vechec", "Zámutov", "Hencovce"],
  },

  // KOŠICKÝ KRAJ
  GE: {
    id: "GE",
    name: "Gelnica",
    slug: "gelnica",
    type: "district",
    regionId: "KE",
    cities: ["Gelnica", "Prakovce", "Smolník", "Helcmanovce", "Kojšov", "Mníšek nad Hnilcom"],
  },
  KE1: {
    id: "KE1",
    name: "Košice I",
    slug: "kosice-1",
    type: "district",
    regionId: "KE",
    cities: ["Košice - Staré Mesto", "Košice - Džungľa", "Košice - Sever"],
  },
  KE2: {
    id: "KE2",
    name: "Košice II",
    slug: "kosice-2",
    type: "district",
    regionId: "KE",
    cities: ["Košice - Západ", "Košice - Dargovských hrdinov", "Košice - Myslava", "Košice - Lorinčík"],
  },
  KE3: {
    id: "KE3",
    name: "Košice III",
    slug: "kosice-3",
    type: "district",
    regionId: "KE",
    cities: ["Košice - Juh", "Košice - Krásna", "Košice - Nad jazerom"],
  },
  KE4: {
    id: "KE4",
    name: "Košice IV",
    slug: "kosice-4",
    type: "district",
    regionId: "KE",
    cities: ["Košice - Ťahanovce", "Košice - Barca", "Košice - Šaca", "Košice - Poľov", "Košice - Šebastovce"],
  },
  KS: {
    id: "KS",
    name: "Košice-okolie",
    slug: "kosice-okolie",
    type: "district",
    regionId: "KE",
    cities: ["Moldava nad Bodvou", "Medzev", "Jasov", "Veľká Ida", "Čaňa", "Valaliky", "Ždaňa", "Seňa"],
  },
  MI: {
    id: "MI",
    name: "Michalovce",
    slug: "michalovce",
    type: "district",
    regionId: "KE",
    cities: ["Michalovce", "Veľké Kapušany", "Strážske", "Sobrance", "Pavlovce nad Uhom", "Vinné"],
  },
  RV: {
    id: "RV",
    name: "Rožňava",
    slug: "roznava",
    type: "district",
    regionId: "KE",
    cities: ["Rožňava", "Dobšiná", "Plešivec", "Štítnik", "Betliar", "Krásnohorské Podhradie", "Silica"],
  },
  SO: {
    id: "SO",
    name: "Sobrance",
    slug: "sobrance",
    type: "district",
    regionId: "KE",
    cities: ["Sobrance", "Jenkovce", "Koromľa", "Kristy", "Lekárovce", "Nižná Rybnica"],
  },
  SP_KE: {
    id: "SP_KE",
    name: "Spišská Nová Ves",
    slug: "spisska-nova-ves",
    type: "district",
    regionId: "KE",
    cities: ["Spišská Nová Ves", "Krompachy", "Smižany", "Spišské Vlachy", "Spišské Tomášovce", "Markušovce", "Hrabušice"],
  },
  TV: {
    id: "TV",
    name: "Trebišov",
    slug: "trebisov",
    type: "district",
    regionId: "KE",
    cities: ["Trebišov", "Sečovce", "Kráľovský Chlmec", "Čierna nad Tisou", "Vojčice", "Veľaty", "Zemplínska Nová Ves"],
  },
};

// ============================================
// HELPER FUNKCIE
// ============================================

/**
 * Získa všetky okresy v danom kraji
 */
export function getDistrictsByRegion(regionId: string): District[] {
  return Object.values(DISTRICTS).filter(d => d.regionId === regionId);
}

/**
 * Získa všetky mestá/obce v danom okrese
 */
export function getCitiesByDistrict(districtId: string): string[] {
  return DISTRICTS[districtId]?.cities || [];
}

/**
 * Získa všetky mestá/obce v danom kraji
 */
export function getCitiesByRegion(regionId: string): string[] {
  const districts = getDistrictsByRegion(regionId);
  return districts.flatMap(d => d.cities);
}

/**
 * Získa región pre daný okres
 */
export function getRegionByDistrict(districtId: string): Region | undefined {
  const district = DISTRICTS[districtId];
  return district ? REGIONS[district.regionId] : undefined;
}

/**
 * Vyhľadá lokácie podľa textu
 */
export function searchLocations(query: string): Array<Region | District | { name: string; type: "city"; districtId: string }> {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  
  const results: Array<Region | District | { name: string; type: "city"; districtId: string }> = [];
  
  // Hľadaj v krajoch
  Object.values(REGIONS).forEach(region => {
    if (region.name.toLowerCase().includes(q)) {
      results.push(region);
    }
  });
  
  // Hľadaj v okresoch
  Object.values(DISTRICTS).forEach(district => {
    if (district.name.toLowerCase().includes(q)) {
      results.push(district);
    }
    // Hľadaj v mestách
    district.cities.forEach(city => {
      if (city.toLowerCase().includes(q)) {
        results.push({ name: city, type: "city", districtId: district.id });
      }
    });
  });
  
  return results.slice(0, 20);
}

/**
 * Formátuje lokáciu pre zobrazenie
 */
export function formatLocation(districtId: string, cityName?: string): string {
  const district = DISTRICTS[districtId];
  if (!district) return cityName || "";
  
  const region = REGIONS[district.regionId];
  if (cityName) {
    return `${cityName}, okres ${district.name}, ${region?.name || ""}`;
  }
  return `okres ${district.name}, ${region?.name || ""}`;
}

/**
 * Pre dropdown - všetky kraje
 */
export function getRegionOptions(): Array<{ value: string; label: string }> {
  return Object.values(REGIONS).map(r => ({ value: r.id, label: r.name }));
}

/**
 * Pre dropdown - všetky okresy v kraji
 */
export function getDistrictOptions(regionId?: string): Array<{ value: string; label: string; regionId: string }> {
  const districts = regionId 
    ? getDistrictsByRegion(regionId) 
    : Object.values(DISTRICTS);
  
  return districts.map(d => ({ 
    value: d.id, 
    label: d.name,
    regionId: d.regionId 
  }));
}

/**
 * Pre dropdown - všetky mestá v okrese
 */
export function getCityOptions(districtId?: string): Array<{ value: string; label: string; districtId: string }> {
  if (districtId) {
    const cities = getCitiesByDistrict(districtId);
    return cities.map(c => ({ value: c, label: c, districtId }));
  }
  
  // Všetky mestá
  const results: Array<{ value: string; label: string; districtId: string }> = [];
  Object.values(DISTRICTS).forEach(d => {
    d.cities.forEach(c => {
      results.push({ value: c, label: c, districtId: d.id });
    });
  });
  return results;
}

// Export pre spätnú kompatibilitu
export const REGION_LIST = Object.values(REGIONS);
export const DISTRICT_LIST = Object.values(DISTRICTS);
