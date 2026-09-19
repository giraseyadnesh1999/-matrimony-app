/**
 * Demo data for local development: `npm run seed` (add `-- --reset` to remove and recreate).
 * Creates ~40 complete profiles spread across states, religions, languages and cities, plus NRIs.
 * Demo accounts use *@demo.saathi.test addresses. In development the OTP prints to the server log,
 * so you can sign in as any of them from /login.
 */
import { blindIndex, encrypt } from "../src/lib/crypto";
import { db } from "../src/lib/db";
import { NOTICE_VERSION } from "../src/lib/consent";

let s = 42;
const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)]!;

type Region = { state: string; cities: string[]; tongue: string; names: { f: string[]; m: string[]; sur: string[] }; religions: string[] };
const REGIONS: Region[] = [
  { state: "MH", cities: ["Pune", "Mumbai", "Nagpur"], tongue: "MARATHI", religions: ["HINDU", "HINDU", "JAIN", "BUDDHIST"], names: { f: ["Ananya", "Sneha", "Meera"], m: ["Aditya", "Omkar", "Rohan"], sur: ["Kulkarni", "Deshmukh", "Patil"] } },
  { state: "KA", cities: ["Bengaluru", "Mysuru"], tongue: "KANNADA", religions: ["HINDU", "HINDU", "MUSLIM"], names: { f: ["Divya", "Shruti", "Lakshmi"], m: ["Harish", "Naveen", "Pranav"], sur: ["Gowda", "Hegde", "Shetty"] } },
  { state: "TN", cities: ["Chennai", "Coimbatore"], tongue: "TAMIL", religions: ["HINDU", "CHRISTIAN", "HINDU"], names: { f: ["Kavya", "Priya", "Harini"], m: ["Karthik", "Vignesh", "Arun"], sur: ["Iyer", "Krishnan", "Pillai"] } },
  { state: "KL", cities: ["Kochi", "Thiruvananthapuram"], tongue: "MALAYALAM", religions: ["CHRISTIAN", "HINDU", "MUSLIM"], names: { f: ["Anjali", "Neha", "Sarah"], m: ["Joseph", "Arjun", "Nikhil"], sur: ["Nair", "Thomas", "Menon"] } },
  { state: "DL", cities: ["New Delhi", "Dwarka"], tongue: "HINDI", religions: ["HINDU", "SIKH", "HINDU"], names: { f: ["Ishita", "Riya", "Simran"], m: ["Rahul", "Kunal", "Harpreet"], sur: ["Sharma", "Gupta", "Kapoor"] } },
  { state: "PB", cities: ["Ludhiana", "Amritsar"], tongue: "PUNJABI", religions: ["SIKH", "SIKH", "HINDU"], names: { f: ["Gurleen", "Manpreet", "Jasleen"], m: ["Arshdeep", "Gagan", "Jaskaran"], sur: ["Singh", "Gill", "Sandhu"] } },
  { state: "GJ", cities: ["Ahmedabad", "Surat"], tongue: "GUJARATI", religions: ["HINDU", "JAIN", "HINDU"], names: { f: ["Krishna", "Dhara", "Hetal"], m: ["Jay", "Parth", "Dhruv"], sur: ["Shah", "Patel", "Mehta"] } },
  { state: "WB", cities: ["Kolkata", "Siliguri"], tongue: "BENGALI", religions: ["HINDU", "HINDU", "MUSLIM"], names: { f: ["Ritika", "Sohini", "Tanushree"], m: ["Arnab", "Soumya", "Debanjan"], sur: ["Banerjee", "Chatterjee", "Das"] } },
  { state: "TG", cities: ["Hyderabad"], tongue: "TELUGU", religions: ["HINDU", "MUSLIM", "HINDU"], names: { f: ["Sravani", "Aisha", "Pooja"], m: ["Sai", "Imran", "Vamsi"], sur: ["Reddy", "Rao", "Khan"] } },
  { state: "RJ", cities: ["Jaipur", "Jodhpur"], tongue: "HINDI", religions: ["HINDU", "JAIN"], names: { f: ["Nidhi", "Kritika", "Pallavi"], m: ["Mohit", "Yash", "Devansh"], sur: ["Rathore", "Agarwal", "Bhandari"] } },
  { state: "AS", cities: ["Guwahati"], tongue: "ASSAMESE", religions: ["HINDU", "HINDU"], names: { f: ["Nabanita", "Rimjhim"], m: ["Bhaskar", "Pranjal"], sur: ["Baruah", "Gogoi"] } },
  { state: "UP", cities: ["Lucknow", "Varanasi"], tongue: "HINDI", religions: ["HINDU", "MUSLIM"], names: { f: ["Aarti", "Zoya", "Shivani"], m: ["Ankit", "Faizan", "Saurabh"], sur: ["Mishra", "Ansari", "Tripathi"] } },
];
const EDU = ["BACHELORS", "MASTERS", "MASTERS", "PROFESSIONAL", "MEDICAL", "DOCTORATE", "DIPLOMA"] as const;
const SECTORS = ["IT", "HEALTHCARE", "BANKING", "GOVERNMENT", "EDUCATION", "BUSINESS", "ENGINEERING", "LEGAL"] as const;
const JOBS: Record<string, string[]> = { IT: ["Software engineer", "Product manager"], HEALTHCARE: ["Doctor", "Physiotherapist"], BANKING: ["Chartered accountant", "Analyst"], GOVERNMENT: ["Civil engineer", "Officer"], EDUCATION: ["Lecturer", "Teacher"], BUSINESS: ["Entrepreneur", "Family business"], ENGINEERING: ["Mechanical engineer", "Architect"], LEGAL: ["Advocate", "Legal counsel"] };
const INCOME = ["5_7L", "7_10L", "10_15L", "15_25L", "25_50L", "NOT_DISCLOSED"] as const;
const ABOUT = [
  "I work in a job I enjoy and spend weekends cooking for friends or trekking. Family matters a lot to me, and I am looking for someone kind and curious.",
  "Grounded, close to my family and always up for a good book or a long drive. I value honesty and a sense of humour above everything else.",
  "I enjoy my work, music and travelling to new places. Looking for a partner who is ambitious yet balanced, and who values family time.",
  "Quiet on the outside, talkative once I know you. I love films, cricket and trying local food wherever I travel. Hoping to meet someone thoughtful.",
];

async function main() {
  const reset = process.argv.includes("--reset");
  if (reset) {
    const gone = await db.user.deleteMany({ where: { emailHash: { in: Array.from({ length: 200 }, (_, i) => blindIndex("email", `demo${i + 1}@demo.saathi.test`)) } } });
    console.log(`removed ${gone.count} demo users`);
  }

  const N = 40;
  let created = 0;
  for (let i = 1; i <= N; i++) {
    const email = `demo${i}@demo.saathi.test`;
    const hash = blindIndex("email", email);
    if (await db.user.findUnique({ where: { emailHash: hash } })) continue;

    const region = REGIONS[(i - 1) % REGIONS.length]!;
    const female = i % 2 === 1;
    const nri = i % 9 === 0;
    const religion = pick(region.religions);
    const sector = pick(SECTORS);
    const age = 23 + Math.floor(rnd() * 14);
    const dob = new Date(Date.UTC(new Date().getUTCFullYear() - age, Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 27)));
    const marital = rnd() < 0.85 ? "NEVER_MARRIED" : "DIVORCED";
    const now = new Date();

    const user = await db.user.create({
      data: {
        emailEnc: encrypt(email),
        emailHash: hash,
        emailVerifiedAt: now,
        lastLoginAt: now,
        consents: { create: [{ purpose: "core_service", granted: true, noticeVersion: NOTICE_VERSION, source: "signup" }, { purpose: "marketing", granted: false, noticeVersion: NOTICE_VERSION, source: "signup" }] },
        profile: {
          create: {
            profileFor: "SELF",
            firstName: pick(female ? region.names.f : region.names.m),
            lastName: pick(region.names.sur),
            gender: female ? "FEMALE" : "MALE",
            dateOfBirth: dob,
            maritalStatus: marital,
            hasChildren: marital === "NEVER_MARRIED" ? null : "NO",
            heightCm: female ? 152 + Math.floor(rnd() * 20) : 165 + Math.floor(rnd() * 22),
            religion,
            motherTongue: region.tongue,
            knownLanguages: ["ENGLISH", "HINDI"],
            caste: religion === "HINDU" && rnd() < 0.6 ? pick(["Brahmin", "Maratha", "Nair", "Reddy", "Agarwal", "Iyer"]) : null,
            country: nri ? "US" : "IN",
            residencyStatus: nri ? "NRI" : "RESIDENT",
            state: nri ? null : region.state,
            city: nri ? pick(["Austin", "San Jose", "Dallas"]) : pick(region.cities),
            education: pick(EDU),
            occupationSector: sector,
            occupation: pick(JOBS[sector]!),
            incomeBand: pick(INCOME),
            diet: religion === "JAIN" ? "JAIN" : pick(["VEG", "VEG", "NON_VEG", "EGGETARIAN"]),
            familyType: pick(["NUCLEAR", "JOINT"]),
            familyValues: pick(["TRADITIONAL", "MODERATE"]),
            brothers: Math.floor(rnd() * 3),
            sisters: Math.floor(rnd() * 3),
            about: pick(ABOUT),
            completeness: 60 + Math.floor(rnd() * 40),
            onboardingStep: 6,
            completedAt: new Date(now.getTime() - Math.floor(rnd() * 20) * 86_400_000),
          },
        },
        preference: { create: { ageMin: Math.max(21, age - 4), ageMax: age + 5, casteNoBar: true, manglik: "ANY" } },
      },
    });
    created++;
    void user;
  }
  console.log(`created ${created} demo members (${N} total wanted). Log in as demo1@demo.saathi.test ... demo${N}@demo.saathi.test`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
