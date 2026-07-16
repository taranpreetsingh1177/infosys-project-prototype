/**
 * Curated bidirectional clinical acronym / alias dictionary.
 * Only these forms participate in verification matching — no open-ended synonymy.
 */

/** Each group is a set of equivalent surface forms (lowercase). */
const ALIAS_GROUPS: readonly (readonly string[])[] = [
  ["htn", "hypertension", "high blood pressure", "elevated blood pressure"],
  ["dm", "dm2", "dmii", "diabetes", "diabetes mellitus", "type 2 diabetes", "type ii diabetes", "t2dm"],
  ["dm1", "dmi", "type 1 diabetes", "type i diabetes", "t1dm"],
  ["sob", "shortness of breath", "short of breath", "dyspnea", "dyspnoea", "breathlessness"],
  ["cp", "chest pain", "chest discomfort"],
  ["bp", "blood pressure"],
  ["hr", "heart rate", "pulse"],
  ["rr", "respiratory rate", "resp rate"],
  ["temp", "temperature", "fever"],
  ["mi", "myocardial infarction", "heart attack", "stemi", "nstemi"],
  ["cva", "cerebrovascular accident", "stroke"],
  ["tia", "transient ischemic attack", "mini stroke"],
  ["copd", "chronic obstructive pulmonary disease", "emphysema"],
  ["ckd", "chronic kidney disease", "renal insufficiency"],
  ["chf", "congestive heart failure", "heart failure", "hf"],
  ["cad", "coronary artery disease", "coronary disease"],
  ["afib", "a-fib", "a fib", "atrial fibrillation", "af"],
  ["gerd", "gastroesophageal reflux", "acid reflux", "reflux"],
  ["uti", "urinary tract infection", "bladder infection"],
  ["uri", "upper respiratory infection", "upper respiratory tract infection", "cold"],
  ["pna", "pneumonia"],
  ["nvd", "nausea vomiting diarrhea", "nausea and vomiting"],
  ["ha", "headache", "cephalgia"],
  ["abd", "abdominal", "abdomen"],
  ["n/v", "nausea and vomiting", "nausea vomiting"],
  ["bm", "bowel movement", "stool"],
  ["doe", "dyspnea on exertion", "shortness of breath on exertion"],
  ["pnd", "paroxysmal nocturnal dyspnea"],
  ["orthopnea", "orthopnoea"],
  ["ed", "emergency department", "er", "emergency room"],
  ["otc", "over the counter"],
  ["rx", "prescription", "prescribed"],
  ["hx", "history", "past history", "medical history"],
  ["fh", "family history"],
  ["sh", "social history"],
  ["pmh", "past medical history"],
  ["nkda", "no known drug allergies", "no known allergies"],
  ["nka", "no known allergies"],
  ["asa", "aspirin", "acetylsalicylic acid"],
  ["abx", "antibiotics", "antibiotic"],
  ["iv", "intravenous"],
  ["im", "intramuscular"],
  ["po", "by mouth", "oral"],
  ["prn", "as needed"],
  ["bid", "twice daily", "twice a day"],
  ["tid", "three times daily", "three times a day"],
  ["qid", "four times daily", "four times a day"],
  ["qd", "once daily", "daily", "once a day"],
  ["wbc", "white blood cell", "white blood cells", "leukocyte"],
  ["rbc", "red blood cell", "red blood cells"],
  ["hgb", "hemoglobin", "hb"],
  ["hct", "hematocrit"],
  ["plt", "platelet", "platelets"],
  ["bun", "blood urea nitrogen"],
  ["cr", "creatinine"],
  ["egfr", "estimated glomerular filtration rate", "gfr"],
  ["a1c", "hba1c", "hemoglobin a1c", "glycated hemoglobin"],
  ["ldl", "low density lipoprotein", "bad cholesterol"],
  ["hdl", "high density lipoprotein", "good cholesterol"],
  ["tg", "triglycerides", "triglyceride"],
  ["ekg", "ecg", "electrocardiogram"],
  ["cxr", "chest x-ray", "chest radiograph"],
  ["ct", "computed tomography", "cat scan"],
  ["mri", "magnetic resonance imaging"],
  ["us", "ultrasound", "sonogram"],
  ["dvt", "deep vein thrombosis", "deep venous thrombosis"],
  ["pe", "pulmonary embolism"],
  ["osa", "obstructive sleep apnea", "sleep apnea"],
  ["bph", "benign prostatic hyperplasia", "enlarged prostate"],
  ["oa", "osteoarthritis"],
  ["ra", "rheumatoid arthritis"],
  ["ibs", "irritable bowel syndrome"],
  ["ibd", "inflammatory bowel disease"],
  ["hiv", "human immunodeficiency virus"],
  ["tb", "tuberculosis"],
  ["std", "sexually transmitted disease", "sti", "sexually transmitted infection"],
  ["ms", "multiple sclerosis"],
  ["ptsd", "post traumatic stress disorder", "post-traumatic stress disorder"],
  ["adhd", "attention deficit hyperactivity disorder"],
  ["bipolar", "bipolar disorder"],
  ["mdd", "major depressive disorder", "depression"],
  ["anxiety", "anxiety disorder", "gad"],
  ["allergies", "allergy", "allergic"],
  ["asthma", "reactive airway", "reactive airway disease"],
  ["migraine", "migraines"],
  ["seizure", "seizures", "epilepsy"],
  ["syncope", "fainting", "passed out", "pass out"],
  ["palpitations", "palpitation", "heart racing", "racing heart"],
  ["edema", "swelling", "oedema"],
  ["fatigue", "tiredness", "tired", "exhausted"],
  ["dizziness", "dizzy", "lightheaded", "lightheadedness", "vertigo"],
  ["insomnia", "trouble sleeping", "difficulty sleeping", "can't sleep", "cannot sleep"],
  ["constipation", "constipated"],
  ["diarrhea", "diarrhoea", "loose stools"],
  ["hematuria", "blood in urine"],
  ["hematochezia", "blood in stool", "rectal bleeding"],
  ["melena", "black stools", "tarry stools"],
  ["dysuria", "painful urination", "burning with urination"],
  ["polyuria", "frequent urination", "urinating frequently"],
  ["polydipsia", "excessive thirst", "increased thirst"],
  ["nocturia", "nighttime urination", "urinating at night"],
  ["hemoptysis", "coughing blood", "coughing up blood"],
  ["rhinorrhea", "runny nose", "nasal discharge"],
  ["pharyngitis", "sore throat"],
  ["myalgia", "muscle pain", "muscle aches"],
  ["arthralgia", "joint pain", "joint aches"],
  ["neuropathy", "numbness", "tingling", "paresthesia"],
  ["hyperlipidemia", "high cholesterol", "dyslipidemia", "hl"],
  ["hypothyroidism", "underactive thyroid", "low thyroid"],
  ["hyperthyroidism", "overactive thyroid"],
  ["obesity", "obese", "overweight"],
  ["anemia", "anaemia", "low blood count"],
];

const ALIAS_LOOKUP = buildLookup(ALIAS_GROUPS);

function buildLookup(
  groups: readonly (readonly string[])[],
): Map<string, ReadonlySet<string>> {
  const lookup = new Map<string, Set<string>>();
  for (const group of groups) {
    const normalized = group.map(normalizeKey).filter(Boolean);
    const merged = new Set<string>(normalized);

    // Merge with any existing groups that share a member
    for (const form of [...merged]) {
      const existing = lookup.get(form);
      if (existing) {
        for (const other of existing) merged.add(other);
      }
    }

    for (const form of merged) {
      lookup.set(form, merged);
    }
  }
  return lookup;
}

function normalizeKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Lowercase, strip punctuation to spaces, collapse whitespace. */
export function normalizeForMatch(text: string): string {
  return normalizeKey(text);
}

/** Dense alphanumeric bag for fuzzy containment (e.g. "a-fib" vs "afib"). */
export function denseForm(text: string): string {
  return normalizeForMatch(text).replace(/[^a-z0-9]+/g, "");
}

/**
 * Expand a token or phrase to all known equivalent forms (including itself).
 */
export function expandAliases(tokenOrPhrase: string): Set<string> {
  const key = normalizeForMatch(tokenOrPhrase);
  if (!key) return new Set();

  const fromLookup = ALIAS_LOOKUP.get(key);
  if (fromLookup) {
    return new Set(fromLookup);
  }

  // Multi-word: try longest known phrase match inside the string
  const expanded = new Set<string>([key]);
  for (const [alias, forms] of ALIAS_LOOKUP) {
    if (alias.includes(" ") && (key === alias || key.includes(alias))) {
      for (const form of forms) expanded.add(form);
    }
  }

  return expanded;
}

/**
 * Tokenize text and expand each token/phrase into a bag of alias forms
 * plus the dense concatenation of the original text.
 */
export function expandTextToAliasBag(text: string): Set<string> {
  const normalized = normalizeForMatch(text);
  const bag = new Set<string>();
  if (!normalized) return bag;

  bag.add(normalized);
  const dense = denseForm(normalized);
  if (dense) bag.add(dense);

  for (const form of expandAliases(normalized)) {
    bag.add(form);
    const d = denseForm(form);
    if (d) bag.add(d);
  }

  const tokens = normalized.split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    for (const form of expandAliases(token)) {
      bag.add(form);
      const d = denseForm(form);
      if (d) bag.add(d);
    }
  }

  // Sliding bigrams / trigrams for multi-word aliases
  for (let n = 2; n <= 4; n++) {
    for (let i = 0; i + n <= tokens.length; i++) {
      const phrase = tokens.slice(i, i + n).join(" ");
      for (const form of expandAliases(phrase)) {
        bag.add(form);
        const d = denseForm(form);
        if (d) bag.add(d);
      }
    }
  }

  return bag;
}

/**
 * True when any expanded form of `findingContent` appears in the expanded
 * line bag (or as a dense substring).
 */
export function lineSupportsFindingWithAliases(
  lineText: string,
  findingContent: string,
): boolean {
  const content = normalizeForMatch(findingContent);
  if (!content) return false;

  const lineBag = expandTextToAliasBag(lineText);
  const contentForms = expandAliases(content);
  contentForms.add(content);
  const contentDense = denseForm(content);
  if (contentDense) contentForms.add(contentDense);

  // Also expand content token-wise for multi-word values
  for (const token of content.split(/\s+/).filter((t) => t.length > 1)) {
    for (const form of expandAliases(token)) {
      contentForms.add(form);
    }
  }

  for (const form of contentForms) {
    if (lineBag.has(form)) return true;
    const formDense = denseForm(form);
    if (formDense && formDense.length >= 2) {
      for (const lineForm of lineBag) {
        if (lineForm.includes(formDense) || formDense.includes(lineForm)) {
          // Prefer meaningful overlap: avoid matching tiny fragments
          if (Math.min(lineForm.length, formDense.length) >= 2) {
            if (
              lineForm === formDense ||
              (formDense.length >= 3 && lineForm.includes(formDense)) ||
              (lineForm.length >= 3 && formDense.includes(lineForm))
            ) {
              return true;
            }
          }
        }
      }
    }
  }

  // Token-overlap with alias expansion: ≥50% of content tokens (len>2) supported
  const tokens = content
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9]/g, ""))
    .filter((t) => t.length > 2);

  if (tokens.length === 0) {
    return lineBag.has(content) || [...lineBag].some((f) => f.includes(content));
  }

  const matched = tokens.filter((token) => {
    const forms = expandAliases(token);
    forms.add(token);
    for (const form of forms) {
      if (lineBag.has(form)) return true;
      const d = denseForm(form);
      if (d && [...lineBag].some((f) => f.includes(d))) return true;
    }
    return false;
  });

  return matched.length >= Math.ceil(tokens.length * 0.5);
}
