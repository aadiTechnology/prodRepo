import React from "react";

interface Installment {
  installment_name: string;
  fee_category: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  balance: number;
  status: string;
}

interface InstallmentTableProps {
  installments: Installment[];
}

const statusColor: { [key: string]: string } = {
  PAID: "bg-green-100 text-green-700",
  PARTIAL: "bg-yellow-100 text-yellow-700",
  OVERDUE: "bg-red-100 text-red-700"
};

const InstallmentTable: React.FC<InstallmentTableProps> = ({ installments }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full text-sm border">
      <thead className="bg-gray-100">
        <tr>
          <th className="px-3 py-2">Installment Name</th>
          <th className="px-3 py-2">Fee Category</th>
          <th className="px-3 py-2">Due Date</th>
          <th className="px-3 py-2">Total Amount</th>
          <th className="px-3 py-2">Paid Amount</th>
          <th className="px-3 py-2">Balance</th>
          <th className="px-3 py-2">Status</th>
        </tr>
      </thead>
      <tbody>
        {installments.length === 0 ? (
          <tr>
            <td colSpan={7} className="text-center py-4 text-gray-500">
              No fee ledger found
            </td>
          </tr>
        ) : (
          installments.map((inst, idx) => (
            <tr key={idx}>
              <td className="px-3 py-2">{inst.installment_name}</td>
              <td className="px-3 py-2">{inst.fee_category}</td>
              <td className="px-3 py-2">{inst.due_date}</td>
              <td className="px-3 py-2">₹{inst.total_amount.toFixed(2)}</td>
              <td className="px-3 py-2">₹{inst.paid_amount.toFixed(2)}</td>
              <td className="px-3 py-2">₹{inst.balance.toFixed(2)}</td>
              <td className="px-3 py-2">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColor[inst.status] || "bg-gray-200 text-gray-700"}`}>
                  {inst.status}
                </span>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

export default InstallmentTable;