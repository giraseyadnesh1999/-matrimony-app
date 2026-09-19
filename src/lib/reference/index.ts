/**
 * Reference data for Indian matrimony. Values are stable machine codes stored in the database;
 * labels are display text and can be translated without a migration.
 */
export type Option<V extends string = string> = { readonly value: V; readonly label: string };

/** Turns a const option list into a tuple usable with z.enum(). */
export function optionValues<T extends readonly Option[]>(options: T) {
  return options.map((o) => o.value) as unknown as [T[number]["value"], ...T[number]["value"][]];
}

export function labelOf(options: readonly Option[], value: string | null | undefined): string {
  if (!value) return "";
  return options.find((o) => o.value === value)?.label ?? value;
}

const o = <const V extends string>(value: V, label: string): Option<V> => ({ value, label });

export const PROFILE_FOR = [
  o("SELF", "Myself"),
  o("SON", "My son"),
  o("DAUGHTER", "My daughter"),
  o("BROTHER", "My brother"),
  o("SISTER", "My sister"),
  o("RELATIVE", "A relative"),
  o("FRIEND", "A friend"),
] as const;

export const GENDERS = [o("FEMALE", "Woman"), o("MALE", "Man"), o("OTHER", "Other")] as const;

export const MARITAL_STATUS = [
  o("NEVER_MARRIED", "Never married"),
  o("DIVORCED", "Divorced"),
  o("WIDOWED", "Widowed"),
  o("AWAITING_DIVORCE", "Awaiting divorce"),
  o("ANNULLED", "Annulled"),
  o("SEPARATED", "Separated"),
] as const;

export const HAS_CHILDREN = [
  o("NO", "No"),
  o("YES_WITH_ME", "Yes, living with me"),
  o("YES_NOT_WITH_ME", "Yes, not living with me"),
] as const;

export const PHYSICAL_STATUS = [
  o("NORMAL", "No disability"),
  o("DISABILITY", "Person with disability"),
  o("NOT_SAID", "Prefer not to say"),
] as const;

export const RELIGIONS = [
  o("HINDU", "Hindu"),
  o("MUSLIM", "Muslim"),
  o("CHRISTIAN", "Christian"),
  o("SIKH", "Sikh"),
  o("JAIN", "Jain"),
  o("BUDDHIST", "Buddhist"),
  o("PARSI", "Parsi / Zoroastrian"),
  o("JEWISH", "Jewish"),
  o("BAHAI", "Bahá'í"),
  o("TRIBAL", "Tribal / indigenous faith"),
  o("NO_RELIGION", "Spiritual / not religious"),
  o("OTHER", "Other"),
] as const;

/** Denominations / sects. Caste and sub-caste stay free text: no list can be complete or neutral. */
export const SECTS: Record<string, readonly Option[]> = {
  HINDU: [
    o("VAISHNAV", "Vaishnav"),
    o("SHAIVA", "Shaiva"),
    o("SHAKTA", "Shakta"),
    o("SMARTA", "Smarta"),
    o("LINGAYAT", "Lingayat / Veerashaiva"),
    o("ARYA_SAMAJ", "Arya Samaj"),
    o("SWAMINARAYAN", "Swaminarayan"),
    o("BRAHMO", "Brahmo"),
    o("OTHER", "Other"),
  ],
  MUSLIM: [
    o("SUNNI", "Sunni"),
    o("SHIA", "Shia"),
    o("BOHRA", "Dawoodi Bohra"),
    o("ISMAILI", "Ismaili / Khoja"),
    o("AHMADIYYA", "Ahmadiyya"),
    o("SUFI", "Sufi"),
    o("OTHER", "Other"),
  ],
  CHRISTIAN: [
    o("CATHOLIC", "Roman Catholic"),
    o("SYRIAN_CATHOLIC", "Syrian Catholic"),
    o("SYRIAN_ORTHODOX", "Syrian Orthodox / Jacobite"),
    o("MALANKARA_ORTHODOX", "Malankara Orthodox"),
    o("MAR_THOMA", "Mar Thoma"),
    o("CSI", "Church of South India"),
    o("ANGLICAN", "Anglican"),
    o("BAPTIST", "Baptist"),
    o("PENTECOSTAL", "Pentecostal"),
    o("PROTESTANT", "Protestant"),
    o("OTHER", "Other"),
  ],
  SIKH: [
    o("AMRITDHARI", "Amritdhari"),
    o("KESHDHARI", "Keshdhari"),
    o("SEHAJDHARI", "Sehajdhari"),
    o("NAMDHARI", "Namdhari"),
    o("RAVIDASSIA", "Ravidassia"),
    o("OTHER", "Other"),
  ],
  JAIN: [
    o("DIGAMBAR", "Digambar"),
    o("SHWETAMBAR", "Shwetambar"),
    o("STHANAKVASI", "Sthanakvasi"),
    o("TERAPANTHI", "Terapanthi"),
    o("OTHER", "Other"),
  ],
  BUDDHIST: [
    o("THERAVADA", "Theravada"),
    o("MAHAYANA", "Mahayana"),
    o("VAJRAYANA", "Vajrayana"),
    o("NAVAYANA", "Navayana"),
    o("OTHER", "Other"),
  ],
  PARSI: [o("PARSI", "Parsi"), o("IRANI", "Irani")],
};

/** 22 scheduled languages of the Eighth Schedule plus widely spoken others. */
export const MOTHER_TONGUES = [
  o("ASSAMESE", "Assamese"),
  o("BENGALI", "Bengali"),
  o("BODO", "Bodo"),
  o("DOGRI", "Dogri"),
  o("GUJARATI", "Gujarati"),
  o("HINDI", "Hindi"),
  o("KANNADA", "Kannada"),
  o("KASHMIRI", "Kashmiri"),
  o("KONKANI", "Konkani"),
  o("MAITHILI", "Maithili"),
  o("MALAYALAM", "Malayalam"),
  o("MANIPURI", "Manipuri (Meitei)"),
  o("MARATHI", "Marathi"),
  o("NEPALI", "Nepali"),
  o("ODIA", "Odia"),
  o("PUNJABI", "Punjabi"),
  o("SANSKRIT", "Sanskrit"),
  o("SANTALI", "Santali"),
  o("SINDHI", "Sindhi"),
  o("TAMIL", "Tamil"),
  o("TELUGU", "Telugu"),
  o("URDU", "Urdu"),
  o("ENGLISH", "English"),
  o("AWADHI", "Awadhi"),
  o("BHOJPURI", "Bhojpuri"),
  o("BHILI", "Bhili"),
  o("CHHATTISGARHI", "Chhattisgarhi"),
  o("GARHWALI", "Garhwali"),
  o("GARO", "Garo"),
  o("GONDI", "Gondi"),
  o("HARYANVI", "Haryanvi"),
  o("KHASI", "Khasi"),
  o("KODAVA", "Kodava"),
  o("KOKBOROK", "Kokborok"),
  o("KUMAONI", "Kumaoni"),
  o("MAGAHI", "Magahi"),
  o("MARWARI", "Marwari"),
  o("MIZO", "Mizo"),
  o("NAGA", "Naga languages"),
  o("RAJASTHANI", "Rajasthani"),
  o("SIKKIMESE", "Sikkimese / Bhutia"),
  o("TULU", "Tulu"),
  o("OTHER", "Other"),
] as const;

/** States and Union Territories (ISO 3166-2:IN codes without the "IN-" prefix). */
export const STATES = [
  o("AP", "Andhra Pradesh"),
  o("AR", "Arunachal Pradesh"),
  o("AS", "Assam"),
  o("BR", "Bihar"),
  o("CG", "Chhattisgarh"),
  o("GA", "Goa"),
  o("GJ", "Gujarat"),
  o("HR", "Haryana"),
  o("HP", "Himachal Pradesh"),
  o("JH", "Jharkhand"),
  o("KA", "Karnataka"),
  o("KL", "Kerala"),
  o("MP", "Madhya Pradesh"),
  o("MH", "Maharashtra"),
  o("MN", "Manipur"),
  o("ML", "Meghalaya"),
  o("MZ", "Mizoram"),
  o("NL", "Nagaland"),
  o("OD", "Odisha"),
  o("PB", "Punjab"),
  o("RJ", "Rajasthan"),
  o("SK", "Sikkim"),
  o("TN", "Tamil Nadu"),
  o("TG", "Telangana"),
  o("TR", "Tripura"),
  o("UP", "Uttar Pradesh"),
  o("UT", "Uttarakhand"),
  o("WB", "West Bengal"),
  o("AN", "Andaman & Nicobar Islands"),
  o("CH", "Chandigarh"),
  o("DH", "Dadra & Nagar Haveli and Daman & Diu"),
  o("DL", "Delhi"),
  o("JK", "Jammu & Kashmir"),
  o("LA", "Ladakh"),
  o("LD", "Lakshadweep"),
  o("PY", "Puducherry"),
] as const;

export const COUNTRIES = [
  o("IN", "India"),
  o("US", "United States"),
  o("GB", "United Kingdom"),
  o("CA", "Canada"),
  o("AU", "Australia"),
  o("AE", "United Arab Emirates"),
  o("SG", "Singapore"),
  o("DE", "Germany"),
  o("SA", "Saudi Arabia"),
  o("QA", "Qatar"),
  o("KW", "Kuwait"),
  o("OM", "Oman"),
  o("BH", "Bahrain"),
  o("NZ", "New Zealand"),
  o("MY", "Malaysia"),
  o("NL", "Netherlands"),
  o("IE", "Ireland"),
  o("FR", "France"),
  o("JP", "Japan"),
  o("ZA", "South Africa"),
  o("OTHER", "Other"),
] as const;

export const RESIDENCY_STATUS = [
  o("RESIDENT", "Resident Indian"),
  o("NRI", "NRI"),
  o("OCI_PIO", "OCI / PIO"),
  o("OTHER", "Other"),
] as const;

export const EDUCATION = [
  o("HIGH_SCHOOL", "Up to 12th"),
  o("DIPLOMA", "Diploma / ITI"),
  o("BACHELORS", "Bachelor's degree"),
  o("MASTERS", "Master's degree"),
  o("DOCTORATE", "Doctorate / PhD"),
  o("PROFESSIONAL", "Professional (CA / CS / CMA / CFA)"),
  o("MEDICAL", "Medical (MBBS / BDS / BAMS / other)"),
  o("LAW", "Law degree"),
  o("OTHER", "Other"),
] as const;

export const EDUCATION_FIELD = [
  o("ENGINEERING", "Engineering / Technology"),
  o("MEDICINE", "Medicine & healthcare"),
  o("SCIENCE", "Science"),
  o("COMMERCE", "Commerce & finance"),
  o("MANAGEMENT", "Management"),
  o("ARTS", "Arts & humanities"),
  o("LAW", "Law"),
  o("DESIGN", "Design & architecture"),
  o("EDUCATION", "Education"),
  o("AGRICULTURE", "Agriculture"),
  o("OTHER", "Other"),
] as const;

export const OCCUPATION_SECTOR = [
  o("IT", "IT & software"),
  o("GOVERNMENT", "Government / PSU"),
  o("CIVIL_SERVICES", "Civil services"),
  o("DEFENCE", "Defence / police"),
  o("HEALTHCARE", "Healthcare"),
  o("EDUCATION", "Education & academia"),
  o("BANKING", "Banking & finance"),
  o("BUSINESS", "Business / self-employed"),
  o("ENGINEERING", "Engineering & manufacturing"),
  o("LEGAL", "Legal"),
  o("MEDIA", "Media & creative"),
  o("AGRICULTURE", "Agriculture"),
  o("HOSPITALITY", "Hospitality & travel"),
  o("STUDENT", "Student"),
  o("NOT_WORKING", "Not working"),
  o("OTHER", "Other"),
] as const;

/** Annual income in INR. */
export const INCOME_BAND = [
  o("NOT_DISCLOSED", "Prefer not to say"),
  o("LT_3L", "Below ₹3 lakh"),
  o("3_5L", "₹3 – 5 lakh"),
  o("5_7L", "₹5 – 7.5 lakh"),
  o("7_10L", "₹7.5 – 10 lakh"),
  o("10_15L", "₹10 – 15 lakh"),
  o("15_25L", "₹15 – 25 lakh"),
  o("25_50L", "₹25 – 50 lakh"),
  o("50L_1CR", "₹50 lakh – 1 crore"),
  o("GT_1CR", "Above ₹1 crore"),
] as const;

export const DIET = [
  o("VEG", "Vegetarian"),
  o("NON_VEG", "Non-vegetarian"),
  o("EGGETARIAN", "Eggetarian"),
  o("VEGAN", "Vegan"),
  o("JAIN", "Jain (no root vegetables)"),
] as const;

export const HABIT = [o("NO", "No"), o("OCCASIONALLY", "Occasionally"), o("YES", "Yes")] as const;

export const MANGLIK = [
  o("NO", "No"),
  o("YES", "Yes"),
  o("PARTIAL", "Anshik (partial)"),
  o("DONT_KNOW", "Don't know"),
] as const;

export const RASHI = [
  o("MESHA", "Mesha (Aries)"),
  o("VRISHABHA", "Vrishabha (Taurus)"),
  o("MITHUNA", "Mithuna (Gemini)"),
  o("KARKA", "Karka (Cancer)"),
  o("SIMHA", "Simha (Leo)"),
  o("KANYA", "Kanya (Virgo)"),
  o("TULA", "Tula (Libra)"),
  o("VRISHCHIKA", "Vrishchika (Scorpio)"),
  o("DHANU", "Dhanu (Sagittarius)"),
  o("MAKARA", "Makara (Capricorn)"),
  o("KUMBHA", "Kumbha (Aquarius)"),
  o("MEENA", "Meena (Pisces)"),
] as const;

export const NAKSHATRA = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha",
  "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha",
  "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha",
  "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
].map((n) => o(n.toUpperCase().replace(/\s+/g, "_"), n));

export const FAMILY_TYPE = [o("JOINT", "Joint family"), o("NUCLEAR", "Nuclear family")] as const;
export const FAMILY_VALUES = [
  o("TRADITIONAL", "Traditional"),
  o("MODERATE", "Moderate"),
  o("LIBERAL", "Liberal"),
] as const;

export const MANGLIK_PREFERENCE = [
  o("ANY", "No preference"),
  o("NO", "Non-manglik only"),
  o("YES", "Manglik only"),
] as const;

/** 4'6" (137 cm) to 7'0" (213 cm). */
export const HEIGHTS: Option[] = Array.from({ length: 213 - 137 + 1 }, (_, i) => {
  const cm = 137 + i;
  const totalInches = Math.round(cm / 2.54);
  return o(String(cm), `${Math.floor(totalInches / 12)}′ ${totalInches % 12}″ (${cm} cm)`);
});

export const REPORT_REASONS = [
  o("FAKE_PROFILE", "Fake or impersonating profile"),
  o("HARASSMENT", "Harassment or abusive messages"),
  o("MONEY", "Asked for money / possible fraud"),
  o("INAPPROPRIATE", "Inappropriate content"),
  o("MARRIED", "Already married / misrepresented status"),
  o("OTHER", "Something else"),
] as const;

export const GRIEVANCE_CATEGORIES = [
  o("ACCESS", "I want a copy of my personal data"),
  o("CORRECTION", "Correct or complete my data"),
  o("ERASURE", "Erase my data"),
  o("CONSENT", "Question about consent or withdrawal"),
  o("PROFILE_ABUSE", "Report a profile or misuse of my data"),
  o("OTHER", "Other"),
] as const;

export const NOMINEE_RELATIONS = [
  o("SPOUSE", "Spouse"),
  o("PARENT", "Parent"),
  o("SIBLING", "Sibling"),
  o("CHILD", "Child"),
  o("OTHER", "Other"),
] as const;
