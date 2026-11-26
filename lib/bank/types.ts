// Синтетические данные банка: типы. Все данные вымышленные.

export type Payment = {
  date: string; // YYYY-MM-DD
  clientBin: string;
  supplierBin: string;
  iban: string;
  amount: number;
};

// Только счета BCC (код банка 856).
export type Account = {
  iban: string;
  ownerId: string; // БИН или ИИН
  ownerType: "company" | "ip" | "individual";
  ownerName: string;
  openedAt: string;
};

export type Company = {
  bin: string;
  name: string;
  registeredAt: string;
  status: "active" | "inactive" | "unreliable";
};

export type Complaint = { iban: string; count: number; lastAt: string };

export type Contract = {
  clientBin: string;
  supplierBin: string;
  person: string;
  role: string;
  phone: string;
  source: string;
};

export type BankContext = {
  paymentsBySupplier: Map<string, Payment[]>;
  accounts: Map<string, Account>;
  registry: Map<string, Company>;
  complaints: Map<string, Complaint>;
  contracts: Contract[];
};

export type BankRaw = {
  payments: Payment[];
  accounts: Account[];
  registry: Company[];
  complaints: Complaint[];
  contracts: Contract[];
};
