import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, type ColDef, type ICellRendererParams } from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

type Order = { id: string; item: string; amount: number; status: "PAID" | "SHIPPED" | "PROTECTED" };

const rows: Order[] = [
  { id: "5O190127TN364715T", item: "Block-printed scarf, Indigo", amount: 24, status: "PAID" },
  { id: "8MC585209K746392H", item: "Block-printed scarf, Rust", amount: 26, status: "SHIPPED" },
  { id: "3C679366HH908993F", item: "Brass diya", amount: 18, status: "PROTECTED" },
];

const colours: Record<Order["status"], string> = { PAID: "#b45309", SHIPPED: "#1d4ed8", PROTECTED: "#15803d" };

function StatusCell(p: ICellRendererParams<Order, Order["status"]>) {
  const s = p.value!;
  return <span style={{ color: "#fff", background: colours[s], padding: "2px 8px", borderRadius: 4 }}>{s}</span>;
}

const cols: ColDef<Order>[] = [
  { field: "id", headerName: "Order" },
  { field: "item" },
  { field: "amount", valueFormatter: (p) => `$${p.value.toFixed(2)}` },
  { field: "status", cellRenderer: StatusCell },
];

export default function App() {
  return (
    <div style={{ height: 300, width: 800 }}>
      <AgGridReact<Order> rowData={rows} columnDefs={cols} />
    </div>
  );
}
