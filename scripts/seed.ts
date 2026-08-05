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
/*  Lead data — an India-based riding-gear and automotive import desk          */
/* -------------------------------------------------------------------------- */

type SeedLead = {
  fullName: string;
  email: string;
  phone: string | null;
  company: string;
  country: string;
  productInterest: string;
  quantity: number | null;
  estValueInr: number | null;
  message: string;
  source: "website" | "manual" | "referral";
  status: "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";
  /** Index into TEAM, or null for unassigned. */
  assignee: number | null;
  /** How many days ago this lead arrived. */
  daysAgo: number;
};


/**
 * The active demonstration desk. Customers are based in India and come to
 * Portside to source imported riding gear, vehicle parts, and accessories.
 * The sales team qualifies the requirement, finds an overseas supplier, then
 * manages the import order through quotation, shipment and delivery.
 */
const LEADS: SeedLead[] = [
  { fullName: "Aditya Rao", email: "aditya@autovista.in", phone: "+91 98867 11820", company: "AutoVista Components", country: "India", productInterest: "LED projector headlamp assemblies", quantity: 160, estValueInr: 606000, message: "Need imported projector headlamp assemblies for popular SUV models. Please include photometry, mounting compatibility and import documentation.", source: "website", status: "won", assignee: 3, daysAgo: 84 },
  { fullName: "Saloni Verma", email: "saloni@carcraft.in", phone: "+91 98710 58551", company: "CarCraft Accessories", country: "India", productInterest: "Wireless Apple CarPlay display units", quantity: 350, estValueInr: 573000, message: "Need imported wireless CarPlay display units with rear-camera input. Please confirm quality checks and options for Indian retail packaging.", source: "website", status: "won", assignee: 4, daysAgo: 76 },
  { fullName: "Farah Khan", email: "farah@urbanwheelz.in", phone: "+91 98920 74231", company: "Urban Wheelz", country: "India", productInterest: "Bluetooth helmet intercoms — dual packs", quantity: 240, estValueInr: 423000, message: "Please source dual-rider Bluetooth intercoms from China with Indian charging plugs, private-label packaging and a 12-month warranty option.", source: "website", status: "won", assignee: 4, daysAgo: 72 },
  { fullName: "Harsh Vora", email: "harsh@highroad.in", phone: "+91 93270 44162", company: "HighRoad Motorsports", country: "India", productInterest: "Racing boots and one-piece rain suits", quantity: 130, estValueInr: 374000, message: "Please source mid-range racing boots plus compact rain suits for track-day customers. Need sample sizing before placing our seasonal order.", source: "website", status: "lost", assignee: 2, daysAgo: 62 },
  { fullName: "Ishita Malhotra", email: "ishita@roadready.in", phone: "+91 99991 77206", company: "RoadReady Retail", country: "India", productInterest: "Waterproof motorcycle luggage and tank bags", quantity: 140, estValueInr: 291000, message: "We need imported waterproof luggage for touring motorcycles, including tank bags with phone pockets. Initial assortment for 12 stores.", source: "website", status: "lost", assignee: 3, daysAgo: 58 },
  { fullName: "Raghav Bhatia", email: "raghav@motofleet.in", phone: "+91 97117 60834", company: "MotoFleet Services", country: "India", productInterest: "Motorcycle battery chargers and tyre inflators", quantity: 500, estValueInr: 357000, message: "We are sourcing compact imported battery chargers and tyre inflators for our roadside-assistance kits. Require BIS guidance and branded cartons.", source: "website", status: "lost", assignee: 2, daysAgo: 55 },
  { fullName: "Rohan Shah", email: "rohan@roadcraftauto.in", phone: "+91 98203 22918", company: "Roadcraft Auto Parts", country: "India", productInterest: "Ceramic brake pads for Hyundai and Kia", quantity: 1200, estValueInr: 739000, message: "Our aftermarket network needs Korean ceramic brake pads. Share vehicle compatibility, MOQ and an import quote for Nhava Sheva.", source: "referral", status: "proposal", assignee: 2, daysAgo: 40 },
  { fullName: "Yash Arora", email: "yash@openroad.in", phone: "+91 98722 19406", company: "OpenRoad Gear", country: "India", productInterest: "Modular helmets with Pinlock-ready visors", quantity: 200, estValueInr: 490000, message: "We are comparing imported modular helmet suppliers. Please share ECE 22.06 certificates, Pinlock compatibility and landed pricing for Delhi.", source: "website", status: "proposal", assignee: 3, daysAgo: 39 },
  { fullName: "Ananya Das", email: "ananya@autoglow.in", phone: "+91 98362 11854", company: "AutoGlow Studio", country: "India", productInterest: "Ceramic coating kits and detailing lights", quantity: 220, estValueInr: 249000, message: "Our detailing studios want to import professional ceramic coating starter kits and inspection lights. We need training material from the supplier.", source: "referral", status: "proposal", assignee: 4, daysAgo: 38 },
  { fullName: "Sana Sheikh", email: "sana@ridehive.in", phone: "+91 90044 18829", company: "RideHive Mumbai", country: "India", productInterest: "Carbon-fibre motorcycle gloves", quantity: 300, estValueInr: 241000, message: "Looking for summer riding gloves with carbon knuckle protectors. We need three colours and branding on the cuff.", source: "referral", status: "proposal", assignee: 2, daysAgo: 37 },
  { fullName: "Naina Roy", email: "naina@ridemuse.in", phone: "+91 98305 79421", company: "RideMuse", country: "India", productInterest: "Women's riding gloves and armoured jeans", quantity: 190, estValueInr: 315000, message: "Need imported women-specific riding gloves and armoured jeans in Indian-friendly sizing. Samples and a supplier catalogue would help.", source: "website", status: "proposal", assignee: 4, daysAgo: 36 },
  { fullName: "Manish Gupta", email: "manish@rapidspares.in", phone: "+91 98184 93050", company: "Rapid Spares India", country: "India", productInterest: "Timing belt kits and tensioner bearings", quantity: 850, estValueInr: 631000, message: "Please source OE-grade timing belt kits from Japan or Korea for Maruti, Hyundai and Honda. Our team needs part-number mapping before ordering.", source: "referral", status: "qualified", assignee: 4, daysAgo: 35 },
  { fullName: "Shreya Menon", email: "shreya@partspoint.in", phone: "+91 99801 36120", company: "PartsPoint Bengaluru", country: "India", productInterest: "Turbocharger repair kits and intercooler hoses", quantity: 480, estValueInr: 672000, message: "Please identify imported repair kits for common diesel turbochargers, plus silicone intercooler hoses. Fitment accuracy is essential.", source: "website", status: "qualified", assignee: 2, daysAgo: 34 },
  { fullName: "Arjun Mehta", email: "arjun@apexriders.in", phone: "+91 98765 41021", company: "Apex Riders Bengaluru", country: "India", productInterest: "ECE 22.06 full-face helmets — mixed sizes", quantity: 180, estValueInr: 349000, message: "We need imported full-face helmets for our Bengaluru stores. Please source ECE 22.06-certified models from Thailand or Italy, with a mixed size run and dealer pricing.", source: "website", status: "qualified", assignee: 2, daysAgo: 31 },
  { fullName: "Pooja Deshmukh", email: "pooja@rideroute.in", phone: "+91 98908 50372", company: "RideRoute Pune", country: "India", productInterest: "CE Level 2 back protectors and rain liners", quantity: 400, estValueInr: 224000, message: "Please source CE Level 2 inserts and removable rain liners that fit our current jacket size chart. We need a small trial import first.", source: "website", status: "qualified", assignee: 3, daysAgo: 30 },
  { fullName: "Vikram Sethi", email: "vikram@torquemax.in", phone: "+91 98101 54086", company: "TorqueMax Performance", country: "India", productInterest: "Motorcycle chain and sprocket kits", quantity: 500, estValueInr: 515000, message: "Need imported chain-sprocket kits compatible with KTM Duke and Yamaha R15. Please confirm origin, hardness specification and lead time.", source: "website", status: "qualified", assignee: 4, daysAgo: 29 },
  { fullName: "Abhishek Jain", email: "abhishek@autofix.in", phone: "+91 98992 38614", company: "AutoFix Warehouse", country: "India", productInterest: "Wheel bearing kits and CV joint boots", quantity: 1400, estValueInr: 805000, message: "We want to consolidate an import order of Japanese wheel bearing kits and CV boots. Please share brand options, HS codes and shipment lead time.", source: "website", status: "qualified", assignee: 3, daysAgo: 28 },
  { fullName: "Kabir Anand", email: "kabir@garage89.in", phone: "+91 98730 65244", company: "Garage 89", country: "India", productInterest: "Imported alloy wheel spacers and hub-centric rings", quantity: 700, estValueInr: 266000, message: "Our custom-car workshop needs T6 aluminium spacers and hub-centric rings. Please source by PCD and provide fitment data.", source: "website", status: "proposal", assignee: 2, daysAgo: 27 },
  { fullName: "Meera Nair", email: "meera@helmetdistrict.in", phone: "+91 97462 33581", company: "Helmet District", country: "India", productInterest: "Flip-up helmets with internal sun visor", quantity: 260, estValueInr: 564000, message: "We want a Vietnam-sourced flip-up helmet range with ECE certification. Please share catalogue, colours and container-sharing options.", source: "website", status: "contacted", assignee: 4, daysAgo: 23 },
  { fullName: "Dev Malhotra", email: "dev@throttleline.in", phone: "+91 98180 63841", company: "ThrottleLine", country: "India", productInterest: "Motorcycle crash guards and radiator guards", quantity: 330, estValueInr: 398000, message: "Please source stainless crash guards and radiator guards for Himalayan and KTM Adventure models. We need powder-coat colour options.", source: "referral", status: "contacted", assignee: 2, daysAgo: 22 },
  { fullName: "Divya Iyer", email: "divya@autolinecare.in", phone: "+91 98450 92117", company: "Autoline Care", country: "India", productInterest: "Japanese cabin air filters and wiper blades", quantity: 950, estValueInr: 324000, message: "Please identify a reliable Japanese supplier for cabin filters and hybrid wipers for Honda and Toyota models. We require a consolidated shipment.", source: "website", status: "contacted", assignee: 3, daysAgo: 21 },
  { fullName: "Ritu Bansal", email: "ritu@fleetpro.in", phone: "+91 99104 28734", company: "FleetPro Mobility", country: "India", productInterest: "Heavy-duty car floor mats and boot liners", quantity: 650, estValueInr: 282000, message: "We require imported TPE floor mats and boot liners for SUVs. Please quote model-specific sets and confirm mould availability.", source: "website", status: "contacted", assignee: 4, daysAgo: 19 },
  { fullName: "Neha Kapoor", email: "neha@motomatrix.in", phone: "+91 98112 66342", company: "MotoMatrix Accessories", country: "India", productInterest: "Premium motorcycle riding jackets with CE armour", quantity: 75, estValueInr: 299000, message: "Looking to import all-season riding jackets with Level 2 armour. Need samples first and a quote landed at Mumbai port.", source: "website", status: "contacted", assignee: 3, daysAgo: 18 },
  { fullName: "Ayesha Mirza", email: "ayesha@velocityhub.in", phone: "+91 99872 14033", company: "Velocity Hub", country: "India", productInterest: "Imported helmet visors and anti-fog inserts", quantity: 1000, estValueInr: 216000, message: "Need clear, smoke and iridium replacement visors plus anti-fog inserts for popular helmet models. Please confirm model-by-model compatibility.", source: "website", status: "contacted", assignee: 3, daysAgo: 16 },
  { fullName: "Nikhil Joshi", email: "nikhil@driveguard.in", phone: "+91 97692 44519", company: "DriveGuard Auto Care", country: "India", productInterest: "Dash cameras with parking mode", quantity: 280, estValueInr: 481000, message: "We want an imported dashcam range with parking mode, Indian warranty support and English/Hindi packaging. Quote for air shipment and sea freight.", source: "website", status: "contacted", assignee: 2, daysAgo: 15 },
  { fullName: "Kriti Kulkarni", email: "kriti@cityride.in", phone: "+91 97654 12389", company: "CityRide Gear", country: "India", productInterest: "Open-face retro helmets and visors", quantity: 150, estValueInr: 257000, message: "Looking for imported retro open-face helmets in matte finishes with replacement visors. This is for a monsoon retail campaign.", source: "website", status: "new", assignee: null, daysAgo: 14 },
  { fullName: "Aman Chawla", email: "aman@riderworks.in", phone: "+91 98115 77293", company: "RiderWorks", country: "India", productInterest: "Action-camera helmet mounts and handlebar mounts", quantity: 600, estValueInr: 183000, message: "Need a China-sourced range of vibration-resistant action-camera mounts for helmets and handlebars. We will retail them through our online store.", source: "website", status: "new", assignee: null, daysAgo: 14 },
  { fullName: "Sameer Sood", email: "sameer@motorbay.in", phone: "+91 98719 34207", company: "MotorBay India", country: "India", productInterest: "Aftermarket motorcycle clutch plates", quantity: 900, estValueInr: 448000, message: "Looking for reliable Thai clutch-plate suppliers for Royal Enfield and Bajaj platforms. Please include packing details and MOQ per SKU.", source: "website", status: "new", assignee: null, daysAgo: 13 },
  { fullName: "Karan Bedi", email: "karan@trailbound.in", phone: "+91 99582 17640", company: "Trailbound Adventure Gear", country: "India", productInterest: "Dual-sport boots and knee guards", quantity: 110, estValueInr: 390000, message: "We are opening an adventure-riding corner in Delhi. Need imported dual-sport boots and articulated knee guards across adult sizes.", source: "website", status: "new", assignee: null, daysAgo: 12 },
  { fullName: "Tanya Bose", email: "tanya@speedculture.in", phone: "+91 98310 28142", company: "Speed Culture Kolkata", country: "India", productInterest: "Motocross helmets and goggles", quantity: 95, estValueInr: 340000, message: "Need imported motocross helmets, goggles and tear-offs for a new off-road section. Please suggest suppliers with youth sizes too.", source: "website", status: "new", assignee: null, daysAgo: 11 },
];

// The prior generic commodity fixture is deliberately inactive. Keeping it
// referenced prevents accidental reintroduction through an unused export while
// the active `LEADS` set above remains the only data this script can seed.

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
    // Already rupees — these are order values an Indian buyer would quote.
    est_value_inr: lead.estValueInr,
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
        "Spoke to the buyer about the import requirement. We are shortlisting overseas suppliers and will share landed pricing.",
        "Sent the product specification, compatibility checklist and certification requirements. Following up on Monday.",
        "Buyer confirmed the target budget. Waiting for internal approval before we issue the import proforma.",
        "Supplier samples were dispatched by courier and the tracking link was shared with the buyer.",
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
