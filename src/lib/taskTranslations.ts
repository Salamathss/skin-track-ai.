/**
 * Maps common English skincare task names to i18n keys.
 * Used for translating AI-generated task names at render time.
 * 
 * IMPORTANT: All task names are stored in English in the database.
 * Translation happens only at render time using this dictionary.
 */

const taskMap: Record<string, { en: string; ru: string }> = {
  // Morning tasks
  "morning cleansing": { en: "Morning Cleansing", ru: "Утреннее очищение" },
  "morning cleanser": { en: "Morning Cleanser", ru: "Утреннее очищающее средство" },
  "apply spf": { en: "Apply SPF", ru: "Нанести SPF" },
  "morning spf": { en: "Morning SPF", ru: "Утренний SPF" },
  "spf 30": { en: "SPF 30", ru: "SPF 30" },
  "spf 50": { en: "SPF 50", ru: "SPF 50" },
  "sunscreen": { en: "Sunscreen", ru: "Солнцезащитный крем" },
  "apply sunscreen": { en: "Apply Sunscreen", ru: "Нанести солнцезащитный крем" },
  "morning moisturizer": { en: "Morning Moisturizer", ru: "Утренний увлажняющий крем" },
  "morning serum": { en: "Morning Serum", ru: "Утренняя сыворотка" },
  "morning toner": { en: "Morning Toner", ru: "Утренний тоник" },
  "vitamin c serum": { en: "Vitamin C Serum", ru: "Сыворотка с витамином C" },
  "vitamin c": { en: "Vitamin C", ru: "Витамин C" },
  "hyaluronic acid": { en: "Hyaluronic Acid", ru: "Гиалуроновая кислота" },
  "hyaluronic acid serum": { en: "Hyaluronic Acid Serum", ru: "Сыворотка с гиалуроновой кислотой" },
  "niacinamide serum": { en: "Niacinamide Serum", ru: "Сыворотка с ниацинамидом" },
  "niacinamide": { en: "Niacinamide", ru: "Ниацинамид" },
  "eye cream": { en: "Eye Cream", ru: "Крем для глаз" },
  "eye cream am": { en: "Eye Cream (AM)", ru: "Крем для глаз (утро)" },
  "eye cream pm": { en: "Eye Cream (PM)", ru: "Крем для глаз (вечер)" },
  "primer": { en: "Primer", ru: "Праймер" },

  // Evening tasks
  "evening cleansing": { en: "Evening Cleansing", ru: "Вечернее очищение" },
  "evening cleanser": { en: "Evening Cleanser", ru: "Вечернее очищающее средство" },
  "double cleanse": { en: "Double Cleanse", ru: "Двойное очищение" },
  "double cleansing": { en: "Double Cleansing", ru: "Двойное очищение" },
  "oil cleanser": { en: "Oil Cleanser", ru: "Масляное очищающее средство" },
  "micellar water": { en: "Micellar Water", ru: "Мицеллярная вода" },
  "evening serum": { en: "Evening Serum", ru: "Вечерняя сыворотка" },
  "evening moisturizer": { en: "Evening Moisturizer", ru: "Вечерний увлажняющий крем" },
  "night cream": { en: "Night Cream", ru: "Ночной крем" },
  "retinol": { en: "Retinol", ru: "Ретинол" },
  "retinoid": { en: "Retinoid", ru: "Ретиноид" },
  "retinoid treatment": { en: "Retinoid Treatment", ru: "Ретиноидное лечение" },
  "retinol treatment": { en: "Retinol Treatment", ru: "Ретиноловая обработка" },
  "exfoliate": { en: "Exfoliate", ru: "Эксфолиация" },
  "exfoliation": { en: "Exfoliation", ru: "Эксфолиация" },
  "chemical exfoliant": { en: "Chemical Exfoliant", ru: "Химический эксфолиант" },
  "physical exfoliant": { en: "Physical Exfoliant", ru: "Физический эксфолиант" },
  "aha/bha treatment": { en: "AHA/BHA Treatment", ru: "Лечение AHA/BHA" },
  "aha treatment": { en: "AHA Treatment", ru: "Лечение AHA" },
  "bha treatment": { en: "BHA Treatment", ru: "Лечение BHA" },
  "salicylic acid": { en: "Salicylic Acid", ru: "Салициловая кислота" },
  "glycolic acid": { en: "Glycolic Acid", ru: "Гликолевая кислота" },
  "lactic acid": { en: "Lactic Acid", ru: "Молочная кислота" },
  "benzoyl peroxide": { en: "Benzoyl Peroxide", ru: "Бензоилпероксид" },
  "face mask": { en: "Face Mask", ru: "Маска для лица" },
  "clay mask": { en: "Clay Mask", ru: "Глиняная маска" },
  "sheet mask": { en: "Sheet Mask", ru: "Тканевая маска" },
  "sleeping mask": { en: "Sleeping Mask", ru: "Ночная маска" },
  "sleeping pack": { en: "Sleeping Pack", ru: "Ночная маска" },
  "evening toner": { en: "Evening Toner", ru: "Вечерний тоник" },

  // General
  "moisturize": { en: "Moisturize", ru: "Увлажнение" },
  "moisturizer": { en: "Moisturizer", ru: "Увлажняющий крем" },
  "hydrate": { en: "Hydrate", ru: "Увлажнить" },
  "cleanse": { en: "Cleanse", ru: "Очищение" },
  "cleanser": { en: "Cleanser", ru: "Очищающее средство" },
  "gentle cleanser": { en: "Gentle Cleanser", ru: "Мягкое очищающее средство" },
  "tone": { en: "Tone", ru: "Тонизирование" },
  "toner": { en: "Toner", ru: "Тоник" },
  "serum": { en: "Serum", ru: "Сыворотка" },
  "essence": { en: "Essence", ru: "Эссенция" },
  "spot treatment": { en: "Spot Treatment", ru: "Точечное лечение" },
  "acne treatment": { en: "Acne Treatment", ru: "Лечение акне" },
  "pimple patch": { en: "Pimple Patch", ru: "Патч от прыщей" },
  "lip balm": { en: "Lip Balm", ru: "Бальзам для губ" },
  "lip care": { en: "Lip Care", ru: "Уход за губами" },
  "face oil": { en: "Face Oil", ru: "Масло для лица" },
  "facial oil": { en: "Facial Oil", ru: "Масло для лица" },
  "barrier cream": { en: "Barrier Cream", ru: "Барьерный крем" },
  "barrier repair": { en: "Barrier Repair", ru: "Восстановление барьера" },
  "centella": { en: "Centella", ru: "Центелла" },
  "peptide serum": { en: "Peptide Serum", ru: "Пептидная сыворотка" },
  "ceramide cream": { en: "Ceramide Cream", ru: "Крем с церамидами" },
  "zinc sunscreen": { en: "Zinc Sunscreen", ru: "Цинковый солнцезащитный крем" },
  "matte sunscreen": { en: "Matte Sunscreen", ru: "Матовый солнцезащитный крем" },
  "gel cleanser": { en: "Gel Cleanser", ru: "Гелевое очищающее средство" },
  "foam cleanser": { en: "Foam Cleanser", ru: "Пенка для умывания" },
  "cream cleanser": { en: "Cream Cleanser", ru: "Кремовое очищающее средство" },
  "makeup remover": { en: "Makeup Remover", ru: "Средство для снятия макияжа" },
  "eye makeup remover": { en: "Eye Makeup Remover", ru: "Средство для снятия макияжа с глаз" },
  "body lotion": { en: "Body Lotion", ru: "Лосьон для тела" },
  "hand cream": { en: "Hand Cream", ru: "Крем для рук" },
  "neck cream": { en: "Neck Cream", ru: "Крем для шеи" },
  "drink water": { en: "Drink Water", ru: "Пить воду" },
  "hydration boost": { en: "Hydration Boost", ru: "Усиленное увлажнение" },

  // Russian → English reverse lookup (for retroactive cleanup)
  "утреннее очищение": { en: "Morning Cleansing", ru: "Утреннее очищение" },
  "утреннее очищающее средство": { en: "Morning Cleanser", ru: "Утреннее очищающее средство" },
  "нанести spf": { en: "Apply SPF", ru: "Нанести SPF" },
  "утренний spf": { en: "Morning SPF", ru: "Утренний SPF" },
  "солнцезащитный крем": { en: "Sunscreen", ru: "Солнцезащитный крем" },
  "нанести солнцезащитный крем": { en: "Apply Sunscreen", ru: "Нанести солнцезащитный крем" },
  "утренний увлажняющий крем": { en: "Morning Moisturizer", ru: "Утренний увлажняющий крем" },
  "утренняя сыворотка": { en: "Morning Serum", ru: "Утренняя сыворотка" },
  "утренний тоник": { en: "Morning Toner", ru: "Утренний тоник" },
  "сыворотка с витамином c": { en: "Vitamin C Serum", ru: "Сыворотка с витамином C" },
  "гиалуроновая кислота": { en: "Hyaluronic Acid", ru: "Гиалуроновая кислота" },
  "сыворотка с ниацинамидом": { en: "Niacinamide Serum", ru: "Сыворотка с ниацинамидом" },
  "крем для глаз": { en: "Eye Cream", ru: "Крем для глаз" },
  "вечернее очищение": { en: "Evening Cleansing", ru: "Вечернее очищение" },
  "вечернее очищающее средство": { en: "Evening Cleanser", ru: "Вечернее очищающее средство" },
  "двойное очищение": { en: "Double Cleanse", ru: "Двойное очищение" },
  "вечерняя сыворотка": { en: "Evening Serum", ru: "Вечерняя сыворотка" },
  "вечерний увлажняющий крем": { en: "Evening Moisturizer", ru: "Вечерний увлажняющий крем" },
  "ночной крем": { en: "Night Cream", ru: "Ночной крем" },
  "ретинол": { en: "Retinol", ru: "Ретинол" },
  "эксфолиация": { en: "Exfoliate", ru: "Эксфолиация" },
  "маска для лица": { en: "Face Mask", ru: "Маска для лица" },
  "тканевая маска": { en: "Sheet Mask", ru: "Тканевая маска" },
  "ночная маска": { en: "Sleeping Mask", ru: "Ночная маска" },
  "увлажнение": { en: "Moisturize", ru: "Увлажнение" },
  "очищение": { en: "Cleanse", ru: "Очищение" },
  "тонизирование": { en: "Tone", ru: "Тонизирование" },
  "точечное лечение": { en: "Spot Treatment", ru: "Точечное лечение" },
  "бальзам для губ": { en: "Lip Balm", ru: "Бальзам для губ" },
  "салициловая кислота": { en: "Salicylic Acid", ru: "Салициловая кислота" },
  "бензоилпероксид": { en: "Benzoyl Peroxide", ru: "Бензоилпероксид" },
  "барьерный крем": { en: "Barrier Cream", ru: "Барьерный крем" },
  "мицеллярная вода": { en: "Micellar Water", ru: "Мицеллярная вода" },
  "пенка для умывания": { en: "Foam Cleanser", ru: "Пенка для умывания" },
  "тоник": { en: "Toner", ru: "Тоник" },
  "сыворотка": { en: "Serum", ru: "Сыворотка" },
  "увлажняющий крем": { en: "Moisturizer", ru: "Увлажняющий крем" },
  "очищающее средство": { en: "Cleanser", ru: "Очищающее средство" },
  "лечение акне": { en: "Acne Treatment", ru: "Лечение акне" },
  "масло для лица": { en: "Face Oil", ru: "Масло для лица" },
  "вечерний тоник": { en: "Evening Toner", ru: "Вечерний тоник" },
  "глиняная маска": { en: "Clay Mask", ru: "Глиняная маска" },
};

/**
 * Translates a task name based on current language.
 * Tasks are stored in English. This function translates to the target language.
 */
export function translateTaskName(taskName: string, lang: string): string {
  if (!taskName) return taskName;

  const lower = taskName.toLowerCase().trim();

  // Exact match
  if (taskMap[lower]) {
    return taskMap[lower][lang as "en" | "ru"] || taskName;
  }

  // Partial match — check if any key is contained in the task name
  for (const [key, translations] of Object.entries(taskMap)) {
    if (lower.includes(key) || key.includes(lower)) {
      if (taskName.length > 60) return taskName;
      return translations[lang as "en" | "ru"] || taskName;
    }
  }

  return taskName;
}

const strictRuOverrides: Record<string, string> = {
  "apply sunscreen": "Нанести SPF",
  "morning routine": "Утренний уход",
};

const strictRuTerms: Array<[RegExp, string]> = [
  [/\bmorning routine\b/gi, "Утренний уход"],
  [/\bevening routine\b/gi, "Вечерний уход"],
  [/\bapply sunscreen\b/gi, "Нанести SPF"],
  [/\bsunscreen\b/gi, "солнцезащитный крем"],
  [/\bspf\b/gi, "SPF"],
  [/\bcleanse\b/gi, "очищение"],
  [/\bcleanser\b/gi, "очищающее средство"],
  [/\bmoisturize\b/gi, "увлажнение"],
  [/\bmoisturizer\b/gi, "увлажняющий крем"],
  [/\bserum\b/gi, "сыворотка"],
  [/\btoner\b/gi, "тоник"],
];

export function localizeReminderTask(taskName: string, lang: string): string {
  if (!taskName) return taskName;

  if (!lang.startsWith("ru")) {
    return translateTaskName(taskName, "en");
  }

  const normalized = taskName.toLowerCase().trim();
  if (strictRuOverrides[normalized]) {
    return strictRuOverrides[normalized];
  }

  let localized = translateTaskName(taskName, "ru");
  for (const [pattern, replacement] of strictRuTerms) {
    localized = localized.replace(pattern, replacement);
  }

  if (/[A-Za-z]/.test(localized)) {
    return "Уход за кожей";
  }

  return localized;
}

/**
 * Normalizes a task name to its English canonical form.
 * Used for retroactive cleanup of mixed-language data.
 */
export function normalizeToEnglish(taskName: string): string | null {
  if (!taskName) return null;

  const lower = taskName.toLowerCase().trim();

  // Check if it's already a known English key
  if (taskMap[lower] && !/[а-яА-ЯёЁ]/.test(taskName)) {
    return taskMap[lower].en;
  }

  // Check if it's a Russian string that maps to English
  if (/[а-яА-ЯёЁ]/.test(taskName)) {
    if (taskMap[lower]) {
      return taskMap[lower].en;
    }
    // Partial match for Russian
    for (const [key, translations] of Object.entries(taskMap)) {
      if (/[а-яА-ЯёЁ]/.test(key) && (lower.includes(key) || key.includes(lower))) {
        return translations.en;
      }
    }
  }

  return null; // No normalization found
}

/**
 * Localized day names (short)
 */
const daysLocalized: Record<string, Record<string, string>> = {
  Mon: { en: "M", ru: "Пн" },
  Tue: { en: "T", ru: "Вт" },
  Wed: { en: "W", ru: "Ср" },
  Thu: { en: "T", ru: "Чт" },
  Fri: { en: "F", ru: "Пт" },
  Sat: { en: "S", ru: "Сб" },
  Sun: { en: "S", ru: "Вс" },
};

export function translateDay(day: string, lang: string): string {
  return daysLocalized[day]?.[lang] || day[0];
}

/**
 * Category translation
 */
const categoryMap: Record<string, Record<string, string>> = {
  Morning: { en: "Morning", ru: "Утро" },
  Evening: { en: "Evening", ru: "Вечер" },
  Custom: { en: "Custom", ru: "Свои" },
  General: { en: "General", ru: "Общее" },
  // Russian category normalization
  "Утро": { en: "Morning", ru: "Утро" },
  "Вечер": { en: "Evening", ru: "Вечер" },
};

export function translateCategory(category: string, lang: string): string {
  return categoryMap[category]?.[lang] || category;
}

/**
 * Normalize category to English canonical form
 */
export function normalizeCategoryToEnglish(category: string): string {
  if (categoryMap[category]) {
    return categoryMap[category].en;
  }
  return category;
}
