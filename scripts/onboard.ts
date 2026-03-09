#!/usr/bin/env npx tsx
/**
 * ClawStaff Client Onboarding CLI
 *
 * Interactive walkthrough that collects client info and generates
 * a complete OpenClaw workspace using generate-workspace.
 *
 * Usage:
 *   npx tsx scripts/onboard.ts
 */

import inquirer from "inquirer";
import chalk from "chalk";
import path from "node:path";
import {
  type Vertical,
  type CommunicationStyle,
  type ClientConfig,
  type FAQ,
  TEMPLATES,
  generateSOUL,
  generateWorkspace,
} from "./generate-workspace.js";

// ─────────────────────────────────────────────
// Formatting helpers
// ─────────────────────────────────────────────

const DIVIDER = chalk.gray("─".repeat(60));
const ACCENT = chalk.hex("#ff6b35");
const MUTED = chalk.hex("#6b6b7b");
const HIGHLIGHT = chalk.hex("#f7c948");

function banner() {
  console.log();
  console.log(ACCENT.bold("  ┌─────────────────────────────────────────┐"));
  console.log(ACCENT.bold("  │           ClawStaff Onboarding          │"));
  console.log(ACCENT.bold("  │        AI Agent Staffing Agency         │"));
  console.log(ACCENT.bold("  └─────────────────────────────────────────┘"));
  console.log();
  console.log(
    MUTED(
      "  This wizard collects your client's info and generates"
    )
  );
  console.log(
    MUTED("  a complete OpenClaw workspace in under 5 minutes.")
  );
  console.log();
}

function sectionHeader(num: number, title: string) {
  console.log();
  console.log(DIVIDER);
  console.log(ACCENT.bold(`  STEP ${num}  `) + chalk.white.bold(title));
  console.log(DIVIDER);
  console.log();
}

function label(text: string) {
  return HIGHLIGHT(text);
}

// ─────────────────────────────────────────────
// Vertical metadata for display
// ─────────────────────────────────────────────

const VERTICAL_CHOICES: { name: string; value: Vertical }[] = [
  { name: "Restaurant               (Reviews, Reservations, Inquiries)", value: "restaurant" },
  { name: "Real Estate              (Lead Follow-Up, Scheduling)", value: "realtor" },
  { name: "Fitness Studio           (Membership, Class Booking, Retention)", value: "fitness" },
  { name: "Medical / Dental         (Appointments, No-Shows, Rebooking)", value: "medical" },
  { name: "Home Services            (Leads, Estimates, Reviews, Seasonal)", value: "home-services" },
  { name: "E-Commerce               (Support, Cart Recovery, Reviews)", value: "ecommerce" },
];

const CHANNEL_CHOICES = [
  { name: "WhatsApp", value: "whatsapp" },
  { name: "SMS", value: "sms" },
  { name: "Email", value: "email" },
  { name: "Google Reviews", value: "google_reviews" },
  { name: "Yelp", value: "yelp" },
  { name: "Slack", value: "slack" },
];

const STYLE_CHOICES: { name: string; value: CommunicationStyle }[] = [
  { name: "Warm           Friendly, personable, conversational", value: "warm" },
  { name: "Professional   Polished, composed, detail-oriented", value: "professional" },
  { name: "Casual         Relaxed, texting-style, approachable", value: "casual" },
  { name: "Direct         Efficient, no-fluff, action-focused", value: "direct" },
];

// ─────────────────────────────────────────────
// Detect system timezone
// ─────────────────────────────────────────────

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "America/New_York";
  }
}

// ─────────────────────────────────────────────
// Step 1: Template Selection
// ─────────────────────────────────────────────

async function stepTemplateSelection() {
  sectionHeader(1, "Template Selection");

  const { businessName } = await inquirer.prompt([
    {
      type: "input",
      name: "businessName",
      message: "Business name:",
      validate: (v: string) => v.trim().length > 0 || "Required",
    },
  ]);

  const { ownerName } = await inquirer.prompt([
    {
      type: "input",
      name: "ownerName",
      message: "Owner's first name:",
      validate: (v: string) => v.trim().length > 0 || "Required",
    },
  ]);

  const { vertical } = await inquirer.prompt([
    {
      type: "list",
      name: "vertical",
      message: "Industry vertical:",
      choices: VERTICAL_CHOICES,
    },
  ]);

  const template = TEMPLATES[vertical as Vertical];
  const { agentName } = await inquirer.prompt([
    {
      type: "input",
      name: "agentName",
      message: `Agent name ${MUTED(`(default: ${template.defaultAgentName})`)}:`,
      default: template.defaultAgentName,
    },
  ]);

  const { communicationStyle } = await inquirer.prompt([
    {
      type: "list",
      name: "communicationStyle",
      message: "Communication style:",
      choices: STYLE_CHOICES,
    },
  ]);

  const { channels } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "channels",
      message: "Channels to connect " + MUTED("(space to select, enter to confirm)") + ":",
      choices: CHANNEL_CHOICES,
      validate: (v: string[]) => v.length > 0 || "Select at least one channel",
    },
  ]);

  const detectedTz = detectTimezone();
  const { timezone } = await inquirer.prompt([
    {
      type: "input",
      name: "timezone",
      message: `Timezone ${MUTED(`(detected: ${detectedTz})`)}:`,
      default: detectedTz,
    },
  ]);

  return {
    businessName: businessName.trim(),
    ownerName: ownerName.trim(),
    vertical: vertical as Vertical,
    agentName: agentName.trim(),
    communicationStyle: communicationStyle as CommunicationStyle,
    channels,
    timezone: timezone.trim(),
  };
}

// ─────────────────────────────────────────────
// Step 2: Business Customization
// ─────────────────────────────────────────────

async function stepBusinessCustomization(ownerName: string) {
  sectionHeader(2, "Business Customization");

  const { businessHours } = await inquirer.prompt([
    {
      type: "input",
      name: "businessHours",
      message: `Business hours ${MUTED('(e.g. "Mon-Fri 9am-5pm")')}:`,
      validate: (v: string) => v.trim().length > 0 || "Required",
    },
  ]);

  const { description } = await inquirer.prompt([
    {
      type: "input",
      name: "description",
      message: `Brief business description ${MUTED("(1-2 sentences — what, where)")}:`,
      validate: (v: string) => v.trim().length > 0 || "Required",
    },
  ]);

  const { services } = await inquirer.prompt([
    {
      type: "input",
      name: "services",
      message: `Services offered ${MUTED("(comma-separated)")}:`,
      validate: (v: string) => v.trim().length > 0 || "Required",
    },
  ]);

  // Custom rules loop
  console.log();
  console.log(
    MUTED(
      '  Add custom rules for the agent. Examples:\n' +
      '    "Never offer discounts without my approval"\n' +
      '    "Always mention our free consultation"\n' +
      '    "Parking is behind the building"'
    )
  );
  console.log();

  const customRules: string[] = [];
  let addingRules = true;
  while (addingRules) {
    const { rule } = await inquirer.prompt([
      {
        type: "input",
        name: "rule",
        message: `Custom rule ${MUTED("(enter to finish)")}:`,
      },
    ]);
    if (rule.trim()) {
      customRules.push(rule.trim());
      console.log(chalk.green(`  + Added: "${rule.trim()}"`));
    } else {
      addingRules = false;
    }
  }
  if (customRules.length > 0) {
    console.log(MUTED(`  ${customRules.length} custom rule(s) added`));
  }

  // FAQ loop
  console.log();
  console.log(
    MUTED(
      "  Add common questions your customers ask.\n" +
      "  You'll enter the question, then the approved answer."
    )
  );
  console.log();

  const faqs: FAQ[] = [];
  let addingFaqs = true;
  while (addingFaqs) {
    const { question } = await inquirer.prompt([
      {
        type: "input",
        name: "question",
        message: `FAQ question ${MUTED("(enter to finish)")}:`,
      },
    ]);
    if (!question.trim()) {
      addingFaqs = false;
      continue;
    }
    const { answer } = await inquirer.prompt([
      {
        type: "input",
        name: "answer",
        message: "  Answer:",
        validate: (v: string) => v.trim().length > 0 || "Answer required",
      },
    ]);
    faqs.push({ q: question.trim(), a: answer.trim() });
    console.log(chalk.green(`  + Added FAQ: "${question.trim()}"`));
  }
  if (faqs.length > 0) {
    console.log(MUTED(`  ${faqs.length} FAQ(s) added`));
  }

  // Escalation preferences
  console.log();
  console.log(
    MUTED(
      `  Define what triggers an immediate alert to ${ownerName}\n` +
      "  vs. what can wait for the daily summary."
    )
  );
  console.log();

  console.log(
    MUTED(
      '  Enter items one per line. Examples:\n' +
      '    "1-2 star reviews"\n' +
      '    "Customer mentions food safety"\n' +
      '    "Refund requests over $50"'
    )
  );
  console.log();

  const immediateEsc: string[] = [];
  let addingImmediate = true;
  while (addingImmediate) {
    const { item } = await inquirer.prompt([
      {
        type: "input",
        name: "item",
        message: `Immediate alert trigger ${MUTED("(enter to finish)")}:`,
      },
    ]);
    if (item.trim()) {
      immediateEsc.push(item.trim());
    } else {
      addingImmediate = false;
    }
  }

  const dailySummaryEsc: string[] = [];
  let addingDaily = true;
  while (addingDaily) {
    const { item } = await inquirer.prompt([
      {
        type: "input",
        name: "item",
        message: `Daily summary item ${MUTED("(enter to finish)")}:`,
      },
    ]);
    if (item.trim()) {
      dailySummaryEsc.push(item.trim());
    } else {
      addingDaily = false;
    }
  }

  // Special instructions
  console.log();
  const { specialInstructions } = await inquirer.prompt([
    {
      type: "input",
      name: "specialInstructions",
      message: `Any other special instructions? ${MUTED("(optional, enter to skip)")}:`,
    },
  ]);

  if (specialInstructions.trim()) {
    customRules.push(specialInstructions.trim());
  }

  return {
    businessHours: businessHours.trim(),
    description: description.trim(),
    services: services.trim(),
    customRules,
    faqs,
    escalationRules:
      immediateEsc.length > 0 || dailySummaryEsc.length > 0
        ? { immediate: immediateEsc, dailySummary: dailySummaryEsc }
        : undefined,
  };
}

// ─────────────────────────────────────────────
// Step 3: Review & Confirm
// ─────────────────────────────────────────────

async function stepReviewAndConfirm(config: ClientConfig): Promise<boolean> {
  sectionHeader(3, "Review & Confirm");

  const template = TEMPLATES[config.vertical];
  const agentName = config.agentName || template.defaultAgentName;
  const agentRole = config.agentRole || template.defaultAgentRole;

  // Formatted summary
  console.log(chalk.white.bold("  Configuration Summary"));
  console.log();
  console.log(`  ${label("Business:")}       ${config.businessName}`);
  console.log(`  ${label("Owner:")}          ${config.ownerName}`);
  console.log(
    `  ${label("Vertical:")}       ${config.vertical.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}`
  );
  console.log(`  ${label("Agent:")}          ${agentName} (${agentRole})`);
  console.log(`  ${label("Style:")}          ${config.communicationStyle}`);
  console.log(`  ${label("Channels:")}       ${config.channels.join(", ")}`);
  console.log(`  ${label("Timezone:")}       ${config.timezone}`);
  console.log(`  ${label("Hours:")}          ${config.businessHours}`);
  console.log();
  console.log(
    `  ${label("Description:")}    ${config.businessKnowledge.description}`
  );
  console.log(
    `  ${label("Services:")}       ${config.businessKnowledge.services}`
  );
  console.log();

  if (config.customRules && config.customRules.length > 0) {
    console.log(`  ${label("Custom Rules:")}`);
    for (const rule of config.customRules) {
      console.log(`    ${chalk.gray(">")} ${rule}`);
    }
    console.log();
  }

  if (config.businessKnowledge.faqs.length > 0) {
    console.log(`  ${label("FAQs:")} ${config.businessKnowledge.faqs.length} configured`);
    for (const faq of config.businessKnowledge.faqs) {
      console.log(`    ${chalk.gray("Q:")} ${faq.q}`);
      console.log(`    ${chalk.gray("A:")} ${faq.a}`);
      console.log();
    }
  }

  if (config.escalationRules) {
    if (config.escalationRules.immediate.length > 0) {
      console.log(`  ${label("Immediate Alerts:")}`);
      for (const item of config.escalationRules.immediate) {
        console.log(`    ${chalk.red("!")} ${item}`);
      }
      console.log();
    }
    if (config.escalationRules.dailySummary.length > 0) {
      console.log(`  ${label("Daily Summary:")}`);
      for (const item of config.escalationRules.dailySummary) {
        console.log(`    ${chalk.blue("-")} ${item}`);
      }
      console.log();
    }
  }

  // SOUL.md preview
  console.log(DIVIDER);
  console.log(ACCENT.bold("  SOUL.md Preview") + MUTED("  (first 20 lines)"));
  console.log(DIVIDER);
  console.log();

  const soulPreview = generateSOUL(config, template);
  const previewLines = soulPreview.split("\n").slice(0, 20);
  for (const line of previewLines) {
    console.log(chalk.gray("  " + line));
  }
  console.log(chalk.gray("  ..."));
  console.log();

  // Confirm
  const { confirmed } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirmed",
      message: ACCENT("Generate workspace?"),
      default: true,
    },
  ]);

  return confirmed;
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

async function main() {
  banner();

  // Step 1
  const templateData = await stepTemplateSelection();

  // Step 2
  const customData = await stepBusinessCustomization(templateData.ownerName);

  // Assemble config
  const template = TEMPLATES[templateData.vertical];
  const config: ClientConfig = {
    businessName: templateData.businessName,
    ownerName: templateData.ownerName,
    vertical: templateData.vertical,
    agentName: templateData.agentName,
    agentRole: template.defaultAgentRole,
    communicationStyle: templateData.communicationStyle,
    channels: templateData.channels,
    timezone: templateData.timezone,
    businessHours: customData.businessHours,
    customRules:
      customData.customRules.length > 0 ? customData.customRules : undefined,
    businessKnowledge: {
      description: customData.description,
      services: customData.services,
      faqs: customData.faqs,
    },
    escalationRules: customData.escalationRules,
  };

  // Step 3
  const confirmed = await stepReviewAndConfirm(config);

  if (!confirmed) {
    console.log();
    console.log(MUTED("  Onboarding cancelled. No files were written."));
    console.log();
    process.exit(0);
  }

  // Generate
  console.log();
  console.log(ACCENT.bold("  Generating workspace..."));
  console.log();

  generateWorkspace(config);

  const agentName = config.agentName || template.defaultAgentName;
  const outDir = path.resolve(process.cwd(), "workspaces", agentName);

  // Save the config JSON alongside the workspace for reproducibility
  const fs = await import("node:fs");
  fs.writeFileSync(
    path.join(outDir, "onboard-config.json"),
    JSON.stringify(config, null, 2),
    "utf-8"
  );

  // Next steps
  console.log();
  console.log(DIVIDER);
  console.log(ACCENT.bold("  Workspace Ready"));
  console.log(DIVIDER);
  console.log();
  console.log(`  ${label("Directory:")}  ${outDir}/`);
  console.log();
  console.log(chalk.white.bold("  Generated files:"));
  console.log(`    SOUL.md              Agent identity & behavioral rules`);
  console.log(`    USER.md              Owner profile`);
  console.log(`    HEARTBEAT.md         Proactive task checklist`);
  console.log(`    TOOLS.md             Environment & skill inventory`);
  console.log(`    AGENTS.md            Startup procedures`);
  console.log(`    moltbook-config.md   Moltbook posting & privacy rules`);
  console.log(`    onboard-config.json  Input config (for re-generation)`);
  console.log();
  console.log(chalk.white.bold("  Next steps:"));
  console.log(`    1. Review SOUL.md and tweak any wording`);
  console.log(`    2. Copy workspace to VPS:  ${MUTED(`scp -r ${outDir} user@vps:/agents/${agentName}/`)}`);
  console.log(`    3. Configure openclaw.json with model & channel credentials`);
  console.log(`    4. Start the agent:  ${MUTED(`cd /agents/${agentName} && openclaw start`)}`);
  console.log(`    5. Verify heartbeat cycle is running`);
  console.log();
  console.log(
    MUTED(`  To regenerate:  npx tsx scripts/generate-workspace.ts ${outDir}/onboard-config.json`)
  );
  console.log();
}

main().catch((err) => {
  console.error(chalk.red("Error:"), err.message);
  process.exit(1);
});
