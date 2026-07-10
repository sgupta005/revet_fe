"use client"

import { ListChecks } from "lucide-react"

import { RuleForm } from "@/components/rule-form"
import { RuleItem } from "@/components/rule-item"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { useRules } from "@/hooks/use-rules"

// Client island for the per-repo Rules tool (Phase 11): header, a create form,
// and the editable list of custom review rules the bot enforces in PR review,
// issue analysis, and auto-PR. Data and all CRUD live in useRules; each row owns
// its own edit state via RuleItem.
export function RulesManager({ owner, repo }: { owner: string; repo: string }) {
  const { rules, loading, error, busy, createRule, updateRule, deleteRule } =
    useRules(owner, repo)

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto p-6">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-lg font-medium">
          <ListChecks className="h-5 w-5 text-primary" />
          Rules
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Guidelines Revet enforces in PR reviews, issue analysis, and auto-PRs
          for {owner}/{repo}.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>New rule</CardTitle>
        </CardHeader>
        <CardContent>
          <RuleForm
            submitLabel="Add rule"
            namePlaceholder="Rule name (e.g. No console.log in production code)"
            busy={busy}
            onSubmit={createRule}
            resetOnSubmit
          />
        </CardContent>
      </Card>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : rules.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ListChecks />
            </EmptyMedia>
            <EmptyTitle>No rules yet</EmptyTitle>
            <EmptyDescription>
              Add a rule above and Revet will enforce it across reviews, issue
              analysis, and auto-PRs.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {rules.map((rule) => (
            <li key={rule.id}>
              <RuleItem
                rule={rule}
                busy={busy}
                onUpdate={updateRule}
                onDelete={deleteRule}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
