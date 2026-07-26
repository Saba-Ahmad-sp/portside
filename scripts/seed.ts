/**
 * Portside — seed script.   Run with:  npm run seed
 *
 * Creates the demo team and a realistic book of leads so the app demonstrates
 * something on first load. Idempotent: it clears lead data and reuses existing
 * auth users, so it can be run repeatedly without piling up duplicates.
 *
 * Uses the service role because it provisions auth users and writes activity
 * rows, neither of which any client is permitted to do.
 *
 * The team is deliberately 2 admins + 3 members:
 *   - two admins prove `admin` is a role, not a hardcoded owner id
 *   - three members make the assignee filter meaningful, and are required for
 *     the isolation test to mean anything at all
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = process.env.SEED_PASSWORD ?? "PortsideDemo!2026";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Copy .env.example to .env.local and fill it in.",
  );
  process.exit(1);
}

if (SERVICE_KEY.includes("PASTE_YOUR")) {
  console.error(
    "SUPABASE_SERVICE_ROLE_KEY is still the placeholder.\n" +
      "Paste your real secret key into .env.local first.",
  );
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/* -------------------------------------------------------------------------- */
/*  The team                                                                   */
/* -------------------------------------------------------------------------- */

const TEAM = [
  { email: "admin@portside.demo",  fullName: "Saba Ahmad",       role: "admin"  },
  { email: "dev@portside.demo",    fullName: "Imran Qureshi",    role: "admin"  },
  { email: "priya@portside.demo",  fullName: "Priya Nair",       role: "member" },
  { email: "rahul@portside.demo",  fullName: "Rahul Deshpande",  role: "member" },
  { email: "aisha@portside.demo",  fullName: "Aisha Rahman",     role: "member" },
] as const;

/* -------------------------------------------------------------------------- */
/*  Lead data — a B2B export/import enquiry book                               */
/* -------------------------------------------------------------------------- */

type SeedLead = {
  fullName: string;
  email: string;
  phone: string | null;
  company: string;
  country: string;
  productInterest: string;
  quantity: number | null;
  estValueUsd: number | null;
  message: string;
  source: "website" | "manual" | "referral";
  status: "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";
  /** Index into TEAM, or null for unassigned. */
  assignee: number | null;
  /** How many days ago this lead arrived. */
  daysAgo: number;
};

const LEADS: SeedLead[] = [
  { fullName: "Khalid Al Mansoori", email: "khalid@gulfstargeneral.ae", phone: "+971 50 244 8871", company: "Gulf Star General Trading", country: "United Arab Emirates", productInterest: "Basmati rice, 25kg jute bags", quantity: 2400, estValueUsd: 186000, message: "We supply to hypermarkets across Dubai and Sharjah. Looking for a steady quarterly contract on 1121 basmati. Please share FOB Nhava Sheva pricing and your certification list.", source: "website", status: "qualified", assignee: 2, daysAgo: 34 },
  { fullName: "Marta Kowalski", email: "m.kowalski@baltictrade.pl", phone: "+48 601 442 118", company: "Baltic Trade Group", country: "Poland", productInterest: "Turmeric powder, food grade", quantity: 600, estValueUsd: 42000, message: "Need curcumin content of 3% minimum with lab report. Initial trial order then monthly.", source: "website", status: "contacted", assignee: 3, daysAgo: 12 },
  { fullName: "Daniel Okoye", email: "daniel@westbridgefoods.co.uk", phone: "+44 7700 900412", company: "Westbridge Foods Ltd", country: "United Kingdom", productInterest: "Assorted whole spices", quantity: 1200, estValueUsd: 78500, message: "Sourcing for a UK retail private label. Need BRC-certified packing and a full allergen statement.", source: "referral", status: "proposal", assignee: 2, daysAgo: 47 },
  { fullName: "Chen Wei", email: "chenwei@harbourlinesg.com", phone: "+65 8123 4477", company: "Harbourline Pte Ltd", country: "Singapore", productInterest: "Cotton yarn, 30s combed", quantity: 18000, estValueUsd: 312000, message: "Regular buyer, currently sourcing from Vietnam. Open to switching if lead times are under 21 days.", source: "website", status: "won", assignee: 4, daysAgo: 68 },
  { fullName: "Sophie Dubois", email: "s.dubois@maisonlinen.fr", phone: "+33 6 12 88 40 21", company: "Maison Linen SARL", country: "France", productInterest: "Handloom cotton bed linen", quantity: 3000, estValueUsd: 96000, message: "Boutique hospitality supplier. Quality matters more than price. Can you do custom GSM and our own labels?", source: "website", status: "new", assignee: null, daysAgo: 2 },
  { fullName: "Ahmed Farouk", email: "ahmed@nileimports.eg", phone: "+20 100 552 8830", company: "Nile Imports SAE", country: "Egypt", productInterest: "Black pepper, garbled", quantity: 400, estValueUsd: 29000, message: "First time importing from India. Please advise on documentation and payment terms.", source: "website", status: "contacted", assignee: 3, daysAgo: 8 },
  { fullName: "Lena Fischer", email: "l.fischer@rheinorganics.de", phone: "+49 171 4420933", company: "Rhein Organics GmbH", country: "Germany", productInterest: "Organic ginger, dried slices", quantity: 800, estValueUsd: 54000, message: "EU organic certification is mandatory. Please send your control body number before we proceed.", source: "website", status: "qualified", assignee: 4, daysAgo: 21 },
  { fullName: "Tom Whitaker", email: "tom.w@southerncrossimports.au", phone: "+61 412 776 300", company: "Southern Cross Imports", country: "Australia", productInterest: "Darjeeling tea, second flush", quantity: 250, estValueUsd: 61000, message: "Specialty tea retailer. Interested in single-estate lots with tasting notes.", source: "referral", status: "proposal", assignee: 2, daysAgo: 29 },
  { fullName: "Ravi Menon", email: "ravi@atlanticspicehouse.com", phone: "+1 646 555 0182", company: "Atlantic Spice House", country: "United States", productInterest: "Cardamom, 8mm bold", quantity: 300, estValueUsd: 88000, message: "Need FDA prior notice handled on your side. We import monthly through Newark.", source: "website", status: "won", assignee: 3, daysAgo: 91 },
  { fullName: "Yuki Tanaka", email: "tanaka@sakuratrading.jp", phone: "+81 90 3344 2210", company: "Sakura Trading KK", country: "Japan", productInterest: "Granite slabs, absolute black", quantity: 45, estValueUsd: 134000, message: "Japanese quality standards are strict. Can you arrange third party inspection before shipment?", source: "website", status: "contacted", assignee: 4, daysAgo: 15 },
  { fullName: "Fatima Al Zahra", email: "fatima@riyadhsupplies.sa", phone: "+966 55 220 4471", company: "Riyadh Supplies Co", country: "Saudi Arabia", productInterest: "Basmati rice, 5kg retail packs", quantity: 5000, estValueUsd: 240000, message: "Ramadan stocking. Need delivery confirmed by end of quarter or the order moves elsewhere.", source: "website", status: "proposal", assignee: 2, daysAgo: 18 },
  { fullName: "Peter Vos", email: "p.vos@lowlandsproduce.nl", phone: "+31 6 2277 4180", company: "Lowlands Produce BV", country: "Netherlands", productInterest: "Fresh grapes, Thompson seedless", quantity: 900, estValueUsd: 47000, message: "Reefer container. What is your cold chain protocol from farm to port?", source: "website", status: "lost", assignee: 3, daysAgo: 55 },
  { fullName: "Grace Mwangi", email: "grace@savannahtextiles.ke", phone: "+254 722 118 440", company: "Savannah Textiles Ltd", country: "Kenya", productInterest: "Polyester viscose blend fabric", quantity: 22000, estValueUsd: 118000, message: "Garment manufacturer supplying regional brands. Need consistent shade matching across lots.", source: "referral", status: "qualified", assignee: 4, daysAgo: 26 },
  { fullName: "Carlos Mendez", email: "cmendez@andescomercio.cl", phone: "+56 9 6644 2201", company: "Andes Comercio SpA", country: "Chile", productInterest: "Leather goods, finished", quantity: 1500, estValueUsd: 92000, message: "Looking for a manufacturing partner rather than a one-off supplier. Can we visit your unit?", source: "website", status: "new", assignee: null, daysAgo: 1 },
  { fullName: "Nadia Petrova", email: "n.petrova@volgaimport.bg", phone: "+359 88 442 1170", company: "Volga Import EOOD", country: "Bulgaria", productInterest: "Sesame seeds, hulled", quantity: 700, estValueUsd: 51000, message: "Please quote CIF Varna. We need a phytosanitary certificate with every shipment.", source: "website", status: "contacted", assignee: 2, daysAgo: 6 },
  { fullName: "James Okafor", email: "james@lagoshealthcare.ng", phone: "+234 803 442 9910", company: "Lagos Healthcare Distributors", country: "Nigeria", productInterest: "Generic pharmaceuticals, WHO-GMP", quantity: null, estValueUsd: 210000, message: "We need a partner with WHO-GMP certification and NAFDAC registration support.", source: "referral", status: "qualified", assignee: 3, daysAgo: 40 },
  { fullName: "Elena Rossi", email: "e.rossi@toscanaimport.it", phone: "+39 340 118 2277", company: "Toscana Import Srl", country: "Italy", productInterest: "Marble handicrafts", quantity: 600, estValueUsd: 38000, message: "Interested in inlay work for a homeware line. Do you have a catalogue of existing designs?", source: "website", status: "new", assignee: null, daysAgo: 4 },
  { fullName: "Bjorn Larsen", email: "bjorn@nordicorganics.no", phone: "+47 913 44 220", company: "Nordic Organics AS", country: "Norway", productInterest: "Organic coconut oil, cold pressed", quantity: 450, estValueUsd: 67000, message: "Need Nordic Swan compatible packaging. Happy to pay a premium for it.", source: "website", status: "contacted", assignee: 4, daysAgo: 10 },
  { fullName: "Amir Hosseini", email: "amir@persiantradehouse.ir", phone: "+98 912 447 1180", company: "Persian Trade House", country: "Iran", productInterest: "Tea, CTC dust grade", quantity: 3200, estValueUsd: 104000, message: "Regular annual requirement. Please confirm whether you can handle the banking route.", source: "website", status: "lost", assignee: 2, daysAgo: 62 },
  { fullName: "Isabella Santos", email: "isabella@brasilagro.com.br", phone: "+55 11 98844 2210", company: "Brasil Agro Importadora", country: "Brazil", productInterest: "Guar gum powder", quantity: 1100, estValueUsd: 73000, message: "Food grade, 200 mesh. Send technical data sheet and viscosity spec.", source: "website", status: "qualified", assignee: 3, daysAgo: 23 },
  { fullName: "Hassan Mahmoud", email: "hassan@doha-trading.qa", phone: "+974 5544 8821", company: "Doha Trading WLL", country: "Qatar", productInterest: "Frozen buffalo meat", quantity: 800, estValueUsd: 156000, message: "Halal certification from an approved body is essential. Which one do you work with?", source: "website", status: "proposal", assignee: 4, daysAgo: 31 },
  { fullName: "Anna Novak", email: "anna@pragueimports.cz", phone: "+420 777 442 118", company: "Prague Imports s.r.o.", country: "Czech Republic", productInterest: "Cotton bath towels", quantity: 8000, estValueUsd: 64000, message: "Hotel supply contract. Need 500 GSM, white, with our woven label.", source: "website", status: "new", assignee: null, daysAgo: 3 },
  { fullName: "Liam O'Connor", email: "liam@emeraldfoods.ie", phone: "+353 87 442 1190", company: "Emerald Foods Ireland", country: "Ireland", productInterest: "Frozen okra and mixed vegetables", quantity: 500, estValueUsd: 39000, message: "IQF quality. Our current supplier has had consistency issues. Send samples first.", source: "referral", status: "contacted", assignee: 2, daysAgo: 9 },
  { fullName: "Mei Lin", email: "meilin@pacificrimtrade.hk", phone: "+852 9442 1180", company: "Pacific Rim Trade Ltd", country: "Hong Kong", productInterest: "Silk sarees and dress material", quantity: 2200, estValueUsd: 128000, message: "We supply diaspora retail in HK and Taiwan. Need design variety more than volume.", source: "website", status: "won", assignee: 3, daysAgo: 74 },
  { fullName: "Viktor Novikov", email: "viktor@almatytrade.kz", phone: "+7 701 442 1180", company: "Almaty Trade LLP", country: "Kazakhstan", productInterest: "Pharmaceutical excipients", quantity: null, estValueUsd: 84000, message: "Please share your product list with CoA samples for the top five items.", source: "website", status: "contacted", assignee: 4, daysAgo: 14 },
  { fullName: "Rebecca Hall", email: "rebecca@torontospice.ca", phone: "+1 416 555 0177", company: "Toronto Spice Company", country: "Canada", productInterest: "Chilli powder, Teja variety", quantity: 550, estValueUsd: 44000, message: "CFIA compliance needed. Our last shipment from another supplier was rejected on aflatoxin.", source: "website", status: "qualified", assignee: 2, daysAgo: 19 },
  { fullName: "Omar Benali", email: "omar@casablancaimport.ma", phone: "+212 661 442 118", company: "Casablanca Import SARL", country: "Morocco", productInterest: "Steel utensils, stainless 304", quantity: 12000, estValueUsd: 71000, message: "Retail chain across Morocco. Need consistent gauge and mirror finish.", source: "website", status: "new", assignee: null, daysAgo: 5 },
  { fullName: "Ingrid Svensson", email: "ingrid@nordhandel.se", phone: "+46 70 442 1180", company: "Nordhandel AB", country: "Sweden", productInterest: "Ayurvedic personal care range", quantity: 4000, estValueUsd: 58000, message: "Need EU cosmetic regulation compliance including CPNP notification support.", source: "referral", status: "proposal", assignee: 3, daysAgo: 27 },
  { fullName: "Diego Fernandez", email: "diego@iberiaimport.es", phone: "+34 611 442 118", company: "Iberia Import SL", country: "Spain", productInterest: "Frozen shrimp, vannamei", quantity: 600, estValueUsd: 142000, message: "EU approved establishment required. Please confirm your plant number.", source: "website", status: "contacted", assignee: 4, daysAgo: 11 },
  { fullName: "Priya Raman", email: "priya@ceylonbridge.lk", phone: "+94 77 442 1180", company: "Ceylon Bridge Traders", country: "Sri Lanka", productInterest: "Onions and potatoes, bulk", quantity: 2800, estValueUsd: 36000, message: "Weekly requirement. Price sensitive, but we pay on time, every time.", source: "website", status: "lost", assignee: 2, daysAgo: 44 },
  { fullName: "Michael Brandt", email: "m.brandt@austriatrade.at", phone: "+43 664 442 1180", company: "Austria Trade GmbH", country: "Austria", productInterest: "Jute bags and eco packaging", quantity: 30000, estValueUsd: 49000, message: "Sustainability is our positioning. Need certification for the jute source.", source: "website", status: "qualified", assignee: 3, daysAgo: 22 },
  { fullName: "Sarah Cohen", email: "sarah@levantimports.il", phone: "+972 54 442 1180", company: "Levant Imports Ltd", country: "Israel", productInterest: "Basmati rice, 1509 variety", quantity: 1800, estValueUsd: 121000, message: "Kosher certification required. Do you have a certified line?", source: "website", status: "new", assignee: null, daysAgo: 1 },
  { fullName: "Thabo Molefe", email: "thabo@capetradepartners.za", phone: "+27 82 442 1180", company: "Cape Trade Partners", country: "South Africa", productInterest: "Auto components, aftermarket", quantity: 5000, estValueUsd: 97000, message: "Aftermarket distribution across SADC. Need part-number level compatibility data.", source: "referral", status: "contacted", assignee: 4, daysAgo: 7 },
  { fullName: "Nguyen Van Minh", email: "minh@saigonimport.vn", phone: "+84 90 442 1180", company: "Saigon Import JSC", country: "Vietnam", productInterest: "Soybean meal, 46% protein", quantity: 4500, estValueUsd: 168000, message: "Feed manufacturer. Need consistent protein levels and quick turnaround on documents.", source: "website", status: "proposal", assignee: 2, daysAgo: 25 },
  { fullName: "Laura Bianchi", email: "laura@milanohome.it", phone: "+39 366 442 1180", company: "Milano Home Srl", country: "Italy", productInterest: "Brass decorative hardware", quantity: 7000, estValueUsd: 55000, message: "Interior design supplier. Send your catalogue and minimum order quantities.", source: "website", status: "won", assignee: 3, daysAgo: 80 },
];

/* -------------------------------------------------------------------------- */

const daysAgoIso = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(9 + (days % 8), (days * 7) % 60, 0, 0);
  return d.toISOString();
};

const plusHours = (iso: string, hours: number) =>
  new Date(new Date(iso).getTime() + hours * 3_600_000).toISOString();

async function upsertTeam(): Promise<string[]> {
  const { data: existing } = await db.auth.admin.listUsers({ perPage: 200 });
  const byEmail = new Map(existing?.users.map((u) => [u.email, u.id]) ?? []);

  const ids: string[] = [];

  for (const person of TEAM) {
    const found = byEmail.get(person.email);

    if (found) {
      // Keep the profile in step in case the seed data changed.
      await db
        .from("profiles")
        .update({ full_name: person.fullName, role: person.role, is_active: true })
        .eq("id", found);
      ids.push(found);
      console.log(`  = ${person.email.padEnd(24)} ${person.role} (existing)`);
      continue;
    }

    const { data, error } = await db.auth.admin.createUser({
      email: person.email,
      password: PASSWORD,
      email_confirm: true,
      // handle_new_user() reads these to create the profile row.
      user_metadata: { full_name: person.fullName, role: person.role },
    });

    if (error || !data.user) {
      throw new Error(`Could not create ${person.email}: ${error?.message}`);
    }

    ids.push(data.user.id);
    console.log(`  + ${person.email.padEnd(24)} ${person.role} (created)`);
  }

  return ids;
}

async function clearLeadData() {
  // Notes and activities cascade from leads.
  await db.from("leads").delete().neq("id", "00000000-0000-0000-0000-000000000000");
}

async function seedLeads(teamIds: string[]) {
  const adminId = teamIds[0];

  const rows = LEADS.map((lead) => ({
    full_name: lead.fullName,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    country: lead.country,
    product_interest: lead.productInterest,
    quantity: lead.quantity,
    est_value_usd: lead.estValueUsd,
    message: lead.message,
    source: lead.source,
    status: lead.status,
    assigned_to: lead.assignee === null ? null : teamIds[lead.assignee],
    created_by: lead.source === "website" ? null : adminId,
    created_at: daysAgoIso(lead.daysAgo),
  }));

  const { data: inserted, error } = await db
    .from("leads")
    .insert(rows)
    .select("id, status, assigned_to, created_at, source");

  if (error) throw new Error(`Lead insert failed: ${error.message}`);

  // Build a plausible activity trail for each lead, in chronological order.
  const activities: Record<string, unknown>[] = [];
  const notes: Record<string, unknown>[] = [];

  const PIPELINE = ["new", "contacted", "qualified", "proposal", "won"] as const;

  inserted.forEach((lead, index) => {
    const created = lead.created_at as string;

    activities.push({
      lead_id: lead.id,
      actor_id: lead.source === "website" ? null : adminId,
      type: "lead_created",
      to_value: "new",
      metadata: { source: lead.source },
      created_at: created,
    });

    if (lead.assigned_to) {
      activities.push({
        lead_id: lead.id,
        actor_id: adminId,
        type: "assigned",
        from_value: null,
        to_value: lead.assigned_to,
        created_at: plusHours(created, 3),
      });
    }

    // Walk the pipeline up to the lead's current status.
    const target = lead.status as string;
    const path = target === "lost" ? ["contacted"] : PIPELINE.slice(1, PIPELINE.indexOf(target as never) + 1);

    let cursor = "new";
    path.forEach((stage, step) => {
      activities.push({
        lead_id: lead.id,
        actor_id: lead.assigned_to ?? adminId,
        type: "status_changed",
        from_value: cursor,
        to_value: stage,
        created_at: plusHours(created, 24 * (step + 1)),
      });
      cursor = stage;
    });

    if (target === "lost") {
      activities.push({
        lead_id: lead.id,
        actor_id: lead.assigned_to ?? adminId,
        type: "status_changed",
        from_value: cursor,
        to_value: "lost",
        created_at: plusHours(created, 24 * 4),
      });
    }

    // A note on roughly every third lead, so the detail page is not empty.
    if (lead.assigned_to && index % 3 === 0) {
      const body = [
        "Called and spoke to the buyer. They want pricing on a 3-month contract rather than a spot order.",
        "Sent the product spec sheet and certification pack. Following up on Monday.",
        "Buyer confirmed budget. Waiting on their internal approval before we send the proforma.",
        "Samples dispatched by courier, tracking shared over email.",
      ][index % 4];

      notes.push({
        lead_id: lead.id,
        author_id: lead.assigned_to,
        body,
        created_at: plusHours(created, 30),
      });

      activities.push({
        lead_id: lead.id,
        actor_id: lead.assigned_to,
        type: "note_added",
        metadata: { preview: body.slice(0, 80) },
        created_at: plusHours(created, 30),
      });
    }
  });

  // metadata is `not null default '{}'`. Passing an explicit null overrides the
  // default, so fill it in rather than omitting the key.
  const { error: actErr } = await db
    .from("lead_activities")
    .insert(activities.map((a) => ({ ...a, metadata: a.metadata ?? {} })));
  if (actErr) throw new Error(`Activity insert failed: ${actErr.message}`);

  const { error: noteErr } = await db.from("lead_notes").insert(notes);
  if (noteErr) throw new Error(`Note insert failed: ${noteErr.message}`);

  return { leads: inserted.length, activities: activities.length, notes: notes.length };
}

async function main() {
  console.log("\nPortside seed\n" + "-".repeat(60));

  console.log("\nTeam:");
  const teamIds = await upsertTeam();

  console.log("\nClearing existing lead data...");
  await clearLeadData();

  console.log("Seeding leads...");
  const counts = await seedLeads(teamIds);

  console.log("\n" + "-".repeat(60));
  console.log(`Done. ${counts.leads} leads, ${counts.activities} activities, ${counts.notes} notes.`);
  console.log(`\nSign in with any of these (password: ${PASSWORD}):`);
  for (const person of TEAM) {
    console.log(`  ${person.role.padEnd(6)}  ${person.email}`);
  }
  console.log("");
}

main().catch((error) => {
  console.error("\nSeed failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
