"use client";

import type { BriefRule } from "@/lib/firestore/briefRules";

interface RulesTableProps {
  rules: BriefRule[];
  onEdit: (rule: BriefRule) => void;
  onDelete: (rule: BriefRule) => void;
}

export function RulesTable({ rules, onEdit, onDelete }: RulesTableProps) {
  if (rules.length === 0) {
    return <p className="text-sm text-gray-500">No rules yet.</p>;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-gray-500">
          <th className="py-2 pr-4 font-medium">Keyword</th>
          <th className="py-2 pr-4 font-medium">Kid</th>
          <th className="py-2 pr-4 font-medium">Wear note</th>
          <th className="py-2 pr-4 font-medium">Dinner flag</th>
          <th className="py-2 font-medium">Actions</th>
        </tr>
      </thead>
      <tbody>
        {rules.map((rule) => (
          <tr key={rule.id} className="border-b border-gray-100">
            <td className="py-2 pr-4">{rule.keyword}</td>
            <td className="py-2 pr-4 text-gray-600">{rule.kid || "any"}</td>
            <td className="py-2 pr-4 text-gray-600">{rule.wearNote || "—"}</td>
            <td className="py-2 pr-4 text-gray-600">{rule.dinnerFlag || "—"}</td>
            <td className="py-2">
              <button onClick={() => onEdit(rule)} className="mr-3 text-gray-700 underline">
                Edit
              </button>
              <button onClick={() => onDelete(rule)} className="text-red-600 underline">
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
