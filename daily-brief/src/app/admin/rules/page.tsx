"use client";

import { useEffect, useState } from "react";
import {
  addBriefRule,
  deleteBriefRule,
  STARTER_BRIEF_RULES,
  subscribeBriefRules,
  updateBriefRule,
  type BriefRule,
  type BriefRuleInput,
} from "@/lib/firestore/briefRules";
import { RuleForm } from "@/components/rules/RuleForm";
import { RulesTable } from "@/components/rules/RulesTable";

type FormMode = { kind: "add" } | { kind: "edit"; rule: BriefRule } | null;

export default function RulesPage() {
  const [rules, setRules] = useState<BriefRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    return subscribeBriefRules(
      (data) => {
        setRules(data);
        setLoading(false);
      },
      () => {
        setError("Couldn't load rules.");
        setLoading(false);
      },
    );
  }, []);

  async function handleAdd(input: BriefRuleInput) {
    await addBriefRule(input);
    setFormMode(null);
  }

  async function handleUpdate(id: string, input: BriefRuleInput) {
    await updateBriefRule(id, input);
    setFormMode(null);
  }

  async function handleDelete(rule: BriefRule) {
    if (!confirm(`Delete the "${rule.keyword}" rule?`)) return;
    await deleteBriefRule(rule.id);
  }

  async function handleSeed() {
    setSeeding(true);
    try {
      await Promise.all(STARTER_BRIEF_RULES.map((rule) => addBriefRule(rule)));
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Keyword → prep-note rules matched against today&apos;s schedule and events.
        </p>
        {!formMode && (
          <button
            onClick={() => setFormMode({ kind: "add" })}
            className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white"
          >
            Add rule
          </button>
        )}
      </div>

      {formMode?.kind === "add" && (
        <RuleForm onSubmit={handleAdd} onCancel={() => setFormMode(null)} />
      )}
      {formMode?.kind === "edit" && (
        <RuleForm
          initialValue={formMode.rule}
          onSubmit={(input) => handleUpdate(formMode.rule.id, input)}
          onCancel={() => setFormMode(null)}
        />
      )}

      {loading && <p className="text-sm text-gray-500">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <>
          {rules.length === 0 && (
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="self-start rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              {seeding ? "Loading starter rules…" : "Load starter rules"}
            </button>
          )}
          <RulesTable
            rules={rules}
            onEdit={(rule) => setFormMode({ kind: "edit", rule })}
            onDelete={handleDelete}
          />
        </>
      )}
    </div>
  );
}
