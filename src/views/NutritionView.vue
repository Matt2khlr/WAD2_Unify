<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import { db, auth } from "@/firebase";
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, where, serverTimestamp, setDoc, deleteField, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Calendar, Flame, TrendingUp, Activity, Utensils, Clock, Plus, ChevronLeft, ChevronRight } from "lucide-vue-next";
import { Toast } from "bootstrap";

function toISO(d) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}
const digitsOnly = (s) => (s ?? "").replace(/\D+/g, "");
const n = (x) => (Number.isFinite(Number(x)) ? Number(x) : 0);

const defaultMets = {
  walking: { easy: 2.8, moderate: 3.3, vigorous: 4.5 },
  running: { easy: 7, moderate: 8.3, vigorous: 11 },
  cycling: { easy: 4, moderate: 6, vigorous: 8.5 },
  swimming: { easy: 6, moderate: 7, vigorous: 9.8 },
  gym: { easy: 3, moderate: 5, vigorous: 6 },
  yoga: { easy: 2, moderate: 2.5, vigorous: 3 }
};

const metsMap = ref(defaultMets);
let unsubMets = null;
function metFor(activity, intensity = "moderate") {
  return metsMap.value[(activity || "").toLowerCase()]?.[intensity] ?? 3.5;
}
function kcalFrom(activity, intensity, kg, minutes) {
  const met = metFor(activity, intensity);
  return Math.round((met * 3.5 * kg / 200) * minutes);
}
function bindMets() {
  if (unsubMets) unsubMets();
  unsubMets = onSnapshot(doc(db, "config", "mets"), (snap) => {
    if (snap.exists()) metsMap.value = snap.data();
  });
}

const selectedDate = ref(toISO(new Date()));
const showDatePicker = ref(false);
const userId = ref(null);
const errorMessage = ref("");

const dateInputValue = computed(() => {
  const parts = selectedDate.value.split('-');
  if (parts.length !== 3) return '';
  return selectedDate.value;
});

function selectDate(event) {
  const dateStr = event.target.value;
  errorMessage.value = "";

  if (!dateStr) return;

  const [year, month, day] = dateStr.split('-');
  const selectedDateObj = new Date(year, month - 1, day);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (selectedDateObj > today) {
    errorMessage.value = "Cannot select a future date";
    return;
  }

  selectedDate.value = dateStr;
  showDatePicker.value = false;
}

const initialUseAutoCalorie = String(localStorage.getItem("useAutoCalorie") ?? "true") !== "false";
const initialManualStr = localStorage.getItem("calorieTarget") ?? "";

const targets = ref({
  heightCm: Number(localStorage.getItem("heightCm")) || null,
  weightKg: Number(localStorage.getItem("weightKg")) || null,
  calorieTarget: initialUseAutoCalorie ? null : (n(initialManualStr) || null)
});
const goal = ref(localStorage.getItem("goal") || "maintenance");
const useAutoCalorie = ref(initialUseAutoCalorie);
const calorieInput = ref(initialUseAutoCalorie ? "" : initialManualStr);

let unsubProfile = null;
let syncingProfile = false;
const profileReady = ref(false);

const kcalInputRef = ref(null);

const toastMessage = ref("");
const toastRef = ref(null);
function showToast(message) {
  toastMessage.value = message;
  const el = toastRef.value;
  if (!el) return;
  const t = Toast.getOrCreateInstance(el);
  t.show();
}

const generalDialog = ref(false);
const dialogMessage = ref("");
function openGeneralDialog(message) {
  dialogMessage.value = message || "";
  generalDialog.value = true;
}
function closeGeneralDialog() {
  generalDialog.value = false;
}

function bindProfile() {
  if (unsubProfile) unsubProfile();
  if (!userId.value) {
    profileReady.value = false;
    return;
  }
  const refDoc = doc(db, "profiles", userId.value);
  unsubProfile = onSnapshot(refDoc, (snap) => {
    profileReady.value = true;
    syncingProfile = true;
    if (snap.exists()) {
      const d = snap.data();
      targets.value.heightCm = typeof d.heightCm !== "undefined" ? (d.heightCm ?? null) : targets.value.heightCm;
      targets.value.weightKg = typeof d.weightKg !== "undefined" ? (d.weightKg ?? null) : targets.value.weightKg;
      goal.value = typeof d.goal === "string" ? d.goal : goal.value;
      if (typeof d.useAutoCalorie === "boolean") {
        useAutoCalorie.value = d.useAutoCalorie;
      } else {
        useAutoCalorie.value = !(typeof d.calorieTarget === "number" && d.calorieTarget > 0);
      }
      if (typeof d.calorieTarget === "number" && d.calorieTarget > 0) {
        targets.value.calorieTarget = d.calorieTarget;
        calorieInput.value = useAutoCalorie.value ? "" : String(d.calorieTarget);
      } else {
        targets.value.calorieTarget = null;
        calorieInput.value = useAutoCalorie.value ? "" : (localStorage.getItem("calorieTarget") ?? "");
      }
    } else {
      useAutoCalorie.value = true;
      targets.value.calorieTarget = null;
      calorieInput.value = "";
    }
    localStorage.setItem("heightCm", String(targets.value.heightCm ?? ""));
    localStorage.setItem("weightKg", String(targets.value.weightKg ?? ""));
    localStorage.setItem("goal", goal.value ?? "");
    localStorage.setItem("useAutoCalorie", String(useAutoCalorie.value));
    localStorage.setItem("calorieTarget", useAutoCalorie.value ? "" : (calorieInput.value ?? ""));
    syncingProfile = false;
  });
}

async function saveProfile(partial) {
  if (!userId.value || !profileReady.value) return;
  try {
    await setDoc(doc(db, "profiles", userId.value), { ...partial, updatedAt: serverTimestamp() }, { merge: true });
  } catch (e) { }
}

const mealForm = ref({
  type: "Breakfast",
  name: "",
  kcal: "",
  protein: null,
  carbs: null,
  fat: null
});
const meals = ref([]);
let unsubMeals = null;

const calculatedCalories = computed(() => {
  const p = n(mealForm.value.protein);
  const c = n(mealForm.value.carbs);
  const f = n(mealForm.value.fat);
  return Math.round(p * 4.1 + c * 4.1 + f * 9.3);
});

const newMealTemplate = ref({
  name: "",
  kcal: "",
  p: "",
  c: "",
  f: ""
});
const calculatedTemplateCalories = computed(() => {
  const p = n(newMealTemplate.value.p);
  const c = n(newMealTemplate.value.c);
  const f = n(newMealTemplate.value.f);
  return Math.round(p * 4.1 + c * 4.1 + f * 9.3);
});

const workoutForm = ref({
  activity: "",
  minutes: "",
  intensity: "moderate",
  kcalOverride: ""
});
const workouts = ref([]);
let unsubWorkouts = null;

const mealTemplates = ref(JSON.parse(localStorage.getItem("mealTemplates") || "[]"));
const workoutTemplates = ref(JSON.parse(localStorage.getItem("workoutTemplates") || "[]"));

const mealsSorted = computed(() => [...meals.value].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
const workoutsSorted = computed(() => [...workouts.value].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));

const safeWeight = computed(() => n(targets.value.weightKg) || 70);
const proteinPerKg = computed(() => (goal.value === "muscle-gain" ? 2.0 : 1.8));
const fatPerKgBase = computed(() => (goal.value === "weight-loss" ? 0.8 : 0.7));

const suggestedCalorie = computed(() => {
  const kg = n(targets.value.weightKg);
  const base = kg > 0 ? Math.round(30 * kg) : 2000;
  if (goal.value === "weight-loss") return Math.round(base * 0.85);
  if (goal.value === "muscle-gain") return Math.round(base * 1.10);
  return base;
});
const useExplicitCalorie = computed(() => !useAutoCalorie.value && n(targets.value.calorieTarget) > 0);
const effectiveCalorieTarget = computed(() => (useExplicitCalorie.value ? n(targets.value.calorieTarget) : suggestedCalorie.value));

const proteinTarget = computed(() => Math.max(1, Math.round(proteinPerKg.value * safeWeight.value)));
const fatTarget = computed(() => {
  const minByKg = Math.round(fatPerKgBase.value * safeWeight.value);
  const minByPercent = Math.round((effectiveCalorieTarget.value * 0.20) / 9.3);
  return Math.max(minByKg, minByPercent);
});
const carbsTarget = computed(() => {
  const kcalLeft = effectiveCalorieTarget.value - (proteinTarget.value * 4.1 + fatTarget.value * 9.3);
  return Math.max(0, Math.round(kcalLeft / 4.1));
});

const previewMinutes = computed(() => {
  const m = Number(String(workoutForm.value.minutes).trim());
  return Number.isFinite(m) && m > 0 ? m : 0;
});
const hasOverride = computed(() => n(workoutForm.value.kcalOverride) > 0);
const previewKcal = computed(() => {
  if (hasOverride.value) return n(workoutForm.value.kcalOverride);
  const mins = previewMinutes.value;
  if (!workoutForm.value.activity || !mins) return 0;
  return kcalFrom(workoutForm.value.activity, workoutForm.value.intensity, safeWeight.value, mins);
});

onMounted(() => {
  bindMets();
  onAuthStateChanged(auth, (u) => {
    userId.value = u?.uid ?? null;
    bindAll();
  });
});
onBeforeUnmount(() => {
  if (unsubMeals) unsubMeals();
  if (unsubWorkouts) unsubWorkouts();
  if (unsubProfile) unsubProfile();
  if (unsubMets) unsubMets();
  if (unsubSchedules) unsubSchedules();
});

watch(selectedDate, bindAll);

watch(mealTemplates, (v) => localStorage.setItem("mealTemplates", JSON.stringify(v)), { deep: true });
watch(workoutTemplates, (v) => localStorage.setItem("workoutTemplates", JSON.stringify(v)), { deep: true });

watch(() => targets.value.heightCm, (v, ov) => {
  if (v === ov) return;
  localStorage.setItem("heightCm", String(v ?? ""));
  if (syncingProfile || !profileReady.value) return;
  saveProfile({ heightCm: v ?? null });
});
watch(() => targets.value.weightKg, (v, ov) => {
  if (v === ov) return;
  localStorage.setItem("weightKg", String(v ?? ""));
  if (syncingProfile || !profileReady.value) return;
  saveProfile({ weightKg: v ?? null });
});
watch(goal, (g, og) => {
  if (g === og) return;
  localStorage.setItem("goal", g);
  saveProfile({ goal: g });
});

watch(calorieInput, (v) => {
  if (syncingProfile) return;
  if (useAutoCalorie.value) return;
  const num = n(v);
  localStorage.setItem("calorieTarget", v ?? "");
  if (!num || num <= 0) {
    targets.value.calorieTarget = null;
    saveProfile({ calorieTarget: deleteField() });
  } else {
    targets.value.calorieTarget = num;
    saveProfile({ calorieTarget: num });
  }
});

watch(useAutoCalorie, async (v, ov) => {
  if (v === ov) return;
  localStorage.setItem("useAutoCalorie", String(v));
  if (v) {
    calorieInput.value = "";
    targets.value.calorieTarget = null;
    localStorage.setItem("calorieTarget", "");
    await saveProfile({ useAutoCalorie: true, calorieTarget: deleteField() });
  } else {
    await saveProfile({ useAutoCalorie: false });
    await nextTick();
    kcalInputRef.value?.focus?.();
    kcalInputRef.value?.select?.();
  }
});

function bindAll() {
  if (!userId.value) {
    meals.value = [];
    workouts.value = [];
    schedules.value = [];
    if (unsubMeals) unsubMeals();
    if (unsubWorkouts) unsubWorkouts();
    if (unsubProfile) unsubProfile();
    if (unsubSchedules) unsubSchedules();
    return;
  }
  bindProfile();
  bindMeals();
  bindWorkouts();
  bindSchedules();
}

function bindMeals() {
  if (unsubMeals) unsubMeals();
  const refCol = collection(db, "meals");
  const qy = query(refCol, where("userId", "==", userId.value), where("date", "==", selectedDate.value));
  unsubMeals = onSnapshot(qy, (snap) => {
    meals.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  });
}
function bindWorkouts() {
  if (unsubWorkouts) unsubWorkouts();
  const refCol = collection(db, "workouts");
  const qy = query(refCol, where("userId", "==", userId.value), where("date", "==", selectedDate.value));
  unsubWorkouts = onSnapshot(qy, (snap) => {
    workouts.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  });
}

async function addMeal() {
  if (!userId.value) { showToast("Sign in to add meals"); return; }
  if (!mealForm.value.name.trim() || calculatedCalories.value <= 0) return;
  const refCol = collection(db, "meals");
  await addDoc(refCol, {
    userId: userId.value,
    type: mealForm.value.type,
    name: mealForm.value.name.trim(),
    kcal: calculatedCalories.value,
    protein: n(mealForm.value.protein),
    carbs: n(mealForm.value.carbs),
    fat: n(mealForm.value.fat),
    date: selectedDate.value,
    createdAt: serverTimestamp()
  });
  showToast("Meal added");
  mealForm.value = { type: "Breakfast", name: "", kcal: "", protein: null, carbs: null, fat: null };
}
async function removeMeal(id) {
  if (!userId.value) return;
  await deleteDoc(doc(db, "meals", id));
  showToast("Meal removed");
}

async function addWorkout() {
  if (!userId.value) { showToast("Sign in to add workouts"); return; }
  const activity = (workoutForm.value.activity || "").trim();
  const minsRaw = Number(String(workoutForm.value.minutes).trim());
  const minutes = Number.isFinite(minsRaw) && minsRaw > 0 ? minsRaw : 0;
  const override = n(workoutForm.value.kcalOverride);
  const hasKcal = override > 0;
  if (!activity) return;
  if (!hasKcal && minutes <= 0) return;
  const kg = safeWeight.value;
  const met = metFor(activity, workoutForm.value.intensity);
  const kcal = hasKcal ? override : Math.round((met * 3.5 * kg / 200) * minutes);
  const refCol = collection(db, "workouts");
  await addDoc(refCol, {
    userId: userId.value,
    activity,
    minutes,
    intensity: workoutForm.value.intensity,
    met,
    kcal,
    date: selectedDate.value,
    source: "manual",
    createdAt: serverTimestamp()
  });
  showToast("Workout added");
  workoutForm.value = { activity: "", minutes: "", intensity: "moderate", kcalOverride: "" };
}
async function removeWorkout(id) {
  if (!userId.value) return;
  await deleteDoc(doc(db, "workouts", id));
  showToast("Workout removed");
}

const totalsMeals = computed(() => ({
  kcal: meals.value.reduce((a, m) => a + n(m.kcal), 0),
  protein: meals.value.reduce((a, m) => a + n(m.protein), 0),
  carbs: meals.value.reduce((a, m) => a + n(m.carbs), 0),
  fat: meals.value.reduce((a, m) => a + n(m.fat), 0)
}));
const totalsWorkouts = computed(() => ({
  minutes: workouts.value.reduce((a, w) => a + n(w.minutes), 0),
  kcal: workouts.value.reduce((a, w) => a + n(w.kcal), 0)
}));
const netCalories = computed(() => totalsMeals.value.kcal - totalsWorkouts.value.kcal);
const netCaloriesDisplay = computed(() => Math.max(0, netCalories.value));

const overCals = computed(() => netCalories.value - effectiveCalorieTarget.value);
const carbsGap = computed(() => Math.max(0, carbsTarget.value - totalsMeals.value.carbs));
const fatGap = computed(() => Math.max(0, fatTarget.value - totalsMeals.value.fat));
const proteinGap = computed(() => Math.max(0, proteinTarget.value - totalsMeals.value.protein));

const suggestions = computed(() => {
  const s = [];
  if (goal.value === "weight-loss") {
    if (overCals.value > 0) s.push({ type: "burn", text: `Burn ~${overCals.value} kcal to reach today’s target.` });
    if (proteinGap.value > 0) s.push({ type: "eat", text: `Aim for +${proteinGap.value.toFixed(0)} g protein.` });
    if (fatGap.value < 0) s.push({ type: "balance", text: `Fat is high; trim fats to stay ≥20% but not excessive.` });
    if (carbsGap.value > 0) s.push({ type: "eat", text: `You can have +${carbsGap.value.toFixed(0)} g carbs if needed.` });
  } else if (goal.value === "muscle-gain") {
    if (proteinGap.value > 0) s.push({ type: "eat", text: `Eat +${proteinGap.value.toFixed(0)} g protein.` });
    if (overCals.value < 0) s.push({ type: "eat", text: `You’re under by ${Math.abs(overCals.value)} kcal — add a snack.` });
  } else {
    if (Math.abs(overCals.value) > 150) s.push({ type: "balance", text: `Adjust by ${Math.abs(overCals.value)} kcal to hit maintenance.` });
  }
  if (overCals.value > 0) {
    const kg = n(targets.value.weightKg) || 1;
    const acts = [
      { name: "Walking", i: "moderate" },
      { name: "Cycling", i: "moderate" },
      { name: "Running", i: "easy" }
    ];
    const extra = acts
      .map((a) => {
        const m = metFor(a.name, a.i);
        const perMin = (m * 3.5 * kg) / 200;
        const mins = perMin > 0 ? Math.ceil(overCals.value / perMin) : 0;
        return `${a.name} ~${mins} min`;
      })
      .join(" • ");
    s.push({ type: "burn", text: extra });
  }
  return s;
});

const mealSearch = ref("");
const mealResults = ref([]);
const searching = ref(false);
async function searchFoods() {
  const q = mealSearch.value.trim();
  if (!q) {
    mealResults.value = [];
    return;
  }
  searching.value = true;
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=12&lang=en&fields=product_name,product_name_en,brands,nutriments,languages_tags`;
    const res = await fetch(url, { headers: { "Accept-Language": "en" } });
    const json = await res.json();
    const prods = Array.isArray(json.products) ? json.products : [];
    const lcq = q.toLowerCase();
    mealResults.value = prods
      .map((p) => {
        const name = p.product_name_en?.trim() || p.product_name?.trim() || "(Unnamed)";
        return {
          name,
          brand: p.brands || "",
          kcal100: p.nutriments?.["energy-kcal_100g"] ?? 0,
          p100: p.nutriments?.["proteins_100g"] ?? 0,
          c100: p.nutriments?.["carbohydrates_100g"] ?? 0,
          f100: p.nutriments?.["fat_100g"] ?? 0,
          langs: p.languages_tags || []
        };
      })
      .filter((r) => r.name.toLowerCase().includes(lcq) || r.langs.includes("en:english"));
  } catch {
    mealResults.value = [];
  } finally {
    searching.value = false;
  }
}
function useResult(r, autoAdd = false) {
  const raw = prompt(`How many grams? (per 100g: ${r.kcal100 || 0} kcal)`, "100");
  if (raw === null) return;
  const grams = Number(String(raw).trim());
  if (!Number.isFinite(grams) || grams <= 0) return;
  const f = grams / 100;
  mealForm.value.name = r.brand ? `${r.name} (${r.brand})` : r.name;
  mealForm.value.kcal = Math.round((r.kcal100 || 0) * f).toString();
  mealForm.value.protein = +((r.p100 || 0) * f).toFixed(1);
  mealForm.value.carbs = +((r.c100 || 0) * f).toFixed(1);
  mealForm.value.fat = +((r.f100 || 0) * f).toFixed(1);
  mealResults.value = [];
  mealSearch.value = "";
  if (autoAdd) addMeal();
}

function addMealTemplate() {
  if (!newMealTemplate.value.name || calculatedTemplateCalories.value <= 0) return;
  mealTemplates.value.push({
    id: Date.now().toString(),
    name: newMealTemplate.value.name.trim(),
    calories: calculatedTemplateCalories.value,
    protein: Number(newMealTemplate.value.p) || 0,
    carbs: Number(newMealTemplate.value.c) || 0,
    fat: Number(newMealTemplate.value.f) || 0
  });
  newMealTemplate.value = { name: "", kcal: "", p: "", c: "", f: "" };
  showToast("Meal template added");
}
function removeMealTemplate(id) {
  mealTemplates.value = mealTemplates.value.filter((t) => t.id !== id);
}
function applyWorkoutTemplate(t) {
  workoutForm.value.activity = t.name;
  workoutForm.value.intensity = t.intensity;
  workoutForm.value.minutes = String(t.duration);
}
function applyMealTemplate(t) {
  mealForm.value.name = t.name;
  mealForm.value.kcal = String(t.calories);
  mealForm.value.protein = t.protein;
  mealForm.value.carbs = t.carbs;
  mealForm.value.fat = t.fat;
}

const newWorkoutTemplate = ref({
  name: "",
  intensity: "moderate",
  dur: ""
});
function addWorkoutTemplate() {
  if (!newWorkoutTemplate.value.name || !Number(newWorkoutTemplate.value.dur)) return;
  workoutTemplates.value.push({
    id: Date.now().toString(),
    name: newWorkoutTemplate.value.name.trim(),
    intensity: newWorkoutTemplate.value.intensity,
    duration: Number(newWorkoutTemplate.value.dur)
  });
  newWorkoutTemplate.value = { name: "", intensity: "moderate", dur: "" };
  showToast("Workout template added");
}
function removeWorkoutTemplate(id) {
  workoutTemplates.value = workoutTemplates.value.filter((t) => t.id !== id);
}

const QUICK_ACTIVITIES = [
  { name: "Walking", icon: "🚶" },
  { name: "Running", icon: "🏃" },
  { name: "Cycling", icon: "🚴" },
  { name: "Swimming", icon: "🏊" },
  { name: "Gym", icon: "💪" },
  { name: "Yoga", icon: "🧘" }
];
const QUICK_DURATIONS = [15, 30, 45, 60];

function changeDate(days) {
  const d = new Date(selectedDate.value);
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (d > today) {
    showToast("Cannot select a future date");
    return;
  }

  selectedDate.value = toISO(d);
}

const schedules = ref([]);
let unsubSchedules = null;
const newSchedule = ref({
  name: "",
  intensity: "moderate",
  minutes: "",
  days: []
});
const weekDays = [
  { label: "Mon", val: "MO" },
  { label: "Tue", val: "TU" },
  { label: "Wed", val: "WE" },
  { label: "Thu", val: "TH" },
  { label: "Fri", val: "FR" },
  { label: "Sat", val: "SA" },
  { label: "Sun", val: "SU" }
];
function toggleScheduleDay(code) {
  const arr = newSchedule.value.days;
  const i = arr.indexOf(code);
  if (i >= 0) arr.splice(i, 1);
  else arr.push(code);
}
function bindSchedules() {
  if (!userId.value) return;
  if (unsubSchedules) unsubSchedules();
  const refCol = collection(db, "workout_schedules");
  const qy = query(refCol, where("userId", "==", userId.value));
  unsubSchedules = onSnapshot(qy, (snap) => {
    schedules.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    applySchedulesForSelectedDate();
  });
}
async function addSchedule() {
  if (!userId.value) { showToast("Sign in to save recurring workouts"); return; }
  const name = (newSchedule.value.name || "").trim();
  const mins = Number(String(newSchedule.value.minutes).trim());
  const days = newSchedule.value.days.slice().sort();
  if (!name) { showToast("Enter an activity name"); return; }
  if (!Number.isFinite(mins) || mins <= 0) { showToast("Minutes must be > 0"); return; }
  if (days.length === 0) { showToast("Pick at least one day"); return; }
  await addDoc(collection(db, "workout_schedules"), {
    userId: userId.value,
    name,
    intensity: newSchedule.value.intensity,
    minutes: mins,
    days,
    createdAt: serverTimestamp()
  });
  showToast("Recurring workout saved");
  newSchedule.value = { name: "", intensity: "moderate", minutes: "", days: [] };
}
async function removeSchedule(id) {
  if (!userId.value) return;
  await deleteDoc(doc(db, "workout_schedules", id));
  showToast("Recurring workout removed");
}
function jsToRRuleDay(dateStr) {
  const d = new Date(dateStr);
  const idx = d.getDay();
  return ["SU", "MO", "TU", "WE", "TH", "FR", "SA"][idx];
}
async function ensureScheduledWorkoutForDate(schedule, dateStr) {
  const wid = `${userId.value}_${dateStr}_${schedule.id}`;
  const wRef = doc(db, "workouts", wid);
  const snap = await getDoc(wRef);
  if (snap.exists()) return;
  const kg = safeWeight.value;
  const kcal = kcalFrom(schedule.name, schedule.intensity || "moderate", kg, schedule.minutes || 0);
  await setDoc(wRef, {
    userId: userId.value,
    activity: schedule.name,
    minutes: schedule.minutes || 0,
    intensity: schedule.intensity || "moderate",
    kcal,
    date: dateStr,
    source: "schedule",
    scheduleId: schedule.id,
    createdAt: serverTimestamp()
  });
}
async function applySchedulesForSelectedDate() {
  if (!userId.value) return;
  const rruleDay = jsToRRuleDay(selectedDate.value);
  if (!rruleDay) return;
  const relevant = schedules.value.filter((s) => s.days?.includes(rruleDay));
  for (const s of relevant) {
    await ensureScheduledWorkoutForDate(s, selectedDate.value);
  }
}
watch([schedules, selectedDate], () => {
  applySchedulesForSelectedDate();
});
</script>

<template>
  <section class="container">
    <div class="min-vh-100 py-4 py-md-5">
      <div class="mb-4 mb-md-5 text-center">
        <h1 class="display-4 fw-bold d-flex justify-content-center align-items-center gap-3">
          Nutrition Tracker
        </h1>
        <p class="text-muted fs-5">Track your nutrition and movement to optimise your wellness.</p>
      </div>

      <div class="d-flex align-items-center justify-content-center mb-4">
        <div class="nav-btn-group d-flex align-items-center">
          <button class="btn btn-sm nav-btn" @click="changeDate(-1)">
            <ChevronLeft :size="18" />
          </button>
          <button class="d-flex align-items-center gap-2 px-2 fw-semibold small" @click="showDatePicker = true">
            <Calendar :size="16" class="text-secondary" />
            {{ fmtDate(selectedDate) }}
          </button>
          <button class="btn btn-sm nav-btn" @click="changeDate(1)">
            <ChevronRight :size="18" />
          </button>
        </div>
      </div>

      <!-- Date Picker Modal -->
      <div class="modal fade" :class="{ show: showDatePicker, 'd-block': showDatePicker }" tabindex="-1"
        style="background-color: rgba(0,0,0,0.5);" v-show="showDatePicker">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Select Date</h5>
              <button type="button" class="btn-close btn-close-white"
                @click="showDatePicker = false; errorMessage = ''"></button>
            </div>
            <div class="modal-body">
              <input type="date" class="form-control" :value="dateInputValue" @change="selectDate" />
              <span style="color: red;">{{ errorMessage }}</span>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn cancel-button" @click="showDatePicker = false; errorMessage = ''">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-3 mb-3">
        <div class="col-12 col-md-6">
          <div class="card h-100 shadow-soft">
            <div class="card-body d-flex align-items-center justify-content-around">
              <div class="text-center">
                <Flame class="text-primary mb-2" :size="24" />
                <div class="fw-bold">{{ totalsMeals.kcal }}</div>
                <div class="small text-muted">Meals kcal</div>
              </div>
              <div class="text-center">
                <Activity class="text-success mb-2" :size="24" />
                <div class="fw-bold">{{ totalsWorkouts.minutes }}</div>
                <div class="small text-muted">Workout min</div>
              </div>
              <div class="text-center">
                <TrendingUp class="text-info mb-2" :size="24" />
                <div class="fw-bold">{{ totalsWorkouts.kcal }}</div>
                <div class="small text-muted">Burned kcal</div>
              </div>
              <div class="text-center">
                <Utensils class="text-dark mb-2" :size="24" />
                <div class="fw-bold">{{ netCaloriesDisplay }}</div>
                <div class="small text-muted">Net kcal</div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-12 col-md-6">
          <div class="card h-100 shadow-soft">
            <div class="card-body">
              <h6 class="mb-3 d-flex align-items-center gap-2">
                <TrendingUp class="text-primary" :size="18" />
                Macros
              </h6>
              <div class="mb-2">
                <div class="d-flex justify-content-between small">
                  <span>Protein</span>
                  <span>{{ totalsMeals.protein }} g / {{ proteinTarget }} g</span>
                </div>
                <div class="progress">
                  <div class="progress-bar pb-protein"
                    :style="{ width: Math.min(100, (totalsMeals.protein / proteinTarget) * 100) + '%' }">
                  </div>
                </div>
              </div>
              <div class="mb-2">
                <div class="d-flex justify-content-between small">
                  <span>Carbs</span>
                  <span>{{ totalsMeals.carbs }} g / {{ carbsTarget }} g</span>
                </div>
                <div class="progress">
                  <div class="progress-bar pb-carbs"
                    :style="{ width: Math.min(100, (totalsMeals.carbs / carbsTarget) * 100) + '%' }">
                  </div>
                </div>
              </div>
              <div>
                <div class="d-flex justify-content-between small">
                  <span>Fat</span>
                  <span>{{ totalsMeals.fat }} g / {{ fatTarget }} g</span>
                </div>
                <div class="progress">
                  <div class="progress-bar pb-fat"
                    :style="{ width: Math.min(100, (totalsMeals.fat / fatTarget) * 100) + '%' }"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card shadow-soft mb-3">
        <div class="card-body">
          <div class="row g-3">
            <!-- Goal Section -->
            <div class="col-12">
              <label class="form-label fw-bold">Goal</label>
              <div class="goal-btn-group">
                <button class="goal-btn" :class="{ active: goal === 'weight-loss' }" @click="goal = 'weight-loss'">
                  <i class="mdi mdi-minus-circle me-2"></i>Weight loss
                </button>
                <button class="goal-btn" :class="{ active: goal === 'maintenance' }" @click="goal = 'maintenance'">
                  <i class="mdi mdi-equal-box me-2"></i>Maintenance
                </button>
                <button class="goal-btn" :class="{ active: goal === 'muscle-gain' }" @click="goal = 'muscle-gain'">
                  <i class="mdi mdi-plus-circle me-2"></i>Muscle gain
                </button>
              </div>
            </div>

            <!-- Form Inputs -->
            <div class="col-12 col-md-6 col-lg-3">
              <label class="form-label">Height (cm)</label>
              <input type="number" class="form-control" v-model="targets.heightCm" />
            </div>
            <div class="col-12 col-md-6 col-lg-3">
              <label class="form-label">Weight (kg)</label>
              <input type="number" class="form-control" v-model="targets.weightKg" />
            </div>
            <div class="col-12 col-md-6 col-lg-3">
              <label class="form-label d-flex align-items-center justify-content-between">
                <span>Calorie Target</span>
                <div class="ios-switch-container">
                  <input type="checkbox" id="autoKcal" class="ios-switch-input" v-model="useAutoCalorie">
                  <label class="ios-switch-label" for="autoKcal">
                    <span class="ios-switch-slider"></span>
                  </label>
                  <label class="form-check-label ms-2" for="autoKcal">Auto</label>
                </div>
              </label>
              <input v-if="useAutoCalorie" type="number" class="form-control" :value="suggestedCalorie" disabled />
              <input v-else ref="kcalInputRef" type="number" min="0" class="form-control" v-model="calorieInput"
                placeholder="e.g., 2000" @keydown.stop @keyup.stop @keypress.stop />
            </div>
          </div>
        </div>
      </div>

      <div class="card shadow-soft mb-3">
        <div class="card-body">
          <h6 class="mb-2 d-flex align-items-center gap-2">
            <Clock class="text-secondary" :size="18" />
            Suggestions
          </h6>
          <div v-if="suggestions.length === 0" class="text-success">
            You're tracking well — no action needed.
          </div>
          <ul v-else class="list-unstyled mb-0">
            <li v-for="(s, i) in suggestions" :key="i" class="mb-1">• {{ s.text }}</li>
          </ul>
        </div>
      </div>

      <div class="card shadow-soft mb-3">
        <div class="card-body">
          <label class="form-label">Search foods (OpenFoodFacts)</label>
          <div class="input-group">
            <input class="form-control" v-model="mealSearch" @keyup.enter="searchFoods"
              placeholder="e.g., chicken rice" />
            <button class="btn btn-outline-secondary" @click="searchFoods" :disabled="searching">{{ searching ?
              "Searching…" : "Search" }}</button>
          </div>
          <ul v-if="mealResults.length" class="list-group mt-2">
            <li v-for="r in mealResults" :key="r.name + r.brand"
              class="list-group-item d-flex justify-content-between align-items-center">
              <div class="me-2">
                <div class="fw-semibold">{{ r.name }}</div>
                <div class="small text-secondary" v-if="r.brand">{{ r.brand }}</div>
                <div class="small text-muted">per 100g: {{ r.kcal100 || 0 }} kcal • P{{ r.p100 || 0 }} C{{
                  r.c100 || 0 }} F{{ r.f100 || 0 }}</div>
              </div>
              <button class="btn btn-sm btn-primary" @click="useResult(r, true)">Add</button>
            </li>
          </ul>
          <div v-else-if="searching" class="small text-muted mt-2">Searching…</div>
        </div>
      </div>

      <div class="card shadow-soft mb-3">
        <div class="card-body">
          <h6 class="mb-2">Add Meal</h6>
          <div class="row g-2 align-items-end">
            <div class="col-12 col-md-3">
              <label class="form-label small text-muted mb-1">Type</label>
              <select class="form-select" v-model="mealForm.type">
                <option>Breakfast</option>
                <option>Lunch</option>
                <option>Dinner</option>
                <option>Snack</option>
              </select>
            </div>
            <div class="col-12 col-md-5">
              <label class="form-label small text-muted mb-1">Meal name</label>
              <input class="form-control" placeholder="e.g., Chicken rice" v-model.trim="mealForm.name" />
            </div>
            <div class="col-4 col-md-1">
              <label class="form-label small text-muted mb-1">P (g)</label>
              <input class="form-control" type="number" min="0" v-model.number="mealForm.protein" />
            </div>
            <div class="col-4 col-md-1">
              <label class="form-label small text-muted mb-1">C (g)</label>
              <input class="form-control" type="number" min="0" v-model.number="mealForm.carbs" />
            </div>
            <div class="col-4 col-md-1">
              <label class="form-label small text-muted mb-1">F (g)</label>
              <input class="form-control" type="number" min="0" v-model.number="mealForm.fat" />
            </div>
            <div class="col-6 col-md-1">
              <label class="form-label small text-muted mb-1">kcal</label>
              <input class="form-control bg-light" type="number" :value="calculatedCalories" readonly />
            </div>
          </div>
          <div class="d-flex gap-2 mt-2">
            <button class="btn save-button" @click="addMeal" :disabled="!mealForm.name || calculatedCalories <= 0">
              <i class="mdi mdi-plus"></i>
              Add
            </button>
          </div>
        </div>
      </div>

      <div class="row g-3 mb-3">
        <div class="col-12 col-lg-6">
          <div class="card h-100 shadow-soft">
            <div class="card-body">
              <h6 class="mb-2">Meal Templates</h6>
              <div class="row g-2 mb-2 align-items-end">
                <div class="col-12 col-md-4">
                  <label class="form-label small text-muted mb-1">Template Name</label>
                  <input class="form-control" placeholder="e.g., Protein Shake" v-model.trim="newMealTemplate.name" />
                </div>
                <div class="col-3 col-md-2">
                  <label class="form-label small text-muted mb-1">Calories (auto)</label>
                  <input class="form-control bg-light" type="number" placeholder="0" :value="calculatedTemplateCalories"
                    readonly />
                </div>
                <div class="col-3 col-md-2">
                  <label class="form-label small text-muted mb-1">Protein (g)</label>
                  <input class="form-control" type="number" min="0" placeholder="0"
                    v-model.number="newMealTemplate.p" />
                </div>
                <div class="col-3 col-md-2">
                  <label class="form-label small text-muted mb-1">Carbs (g)</label>
                  <input class="form-control" type="number" min="0" placeholder="0"
                    v-model.number="newMealTemplate.c" />
                </div>
                <div class="col-3 col-md-2">
                  <label class="form-label small text-muted mb-1">Fat (g)</label>
                  <input class="form-control" type="number" min="0" placeholder="0"
                    v-model.number="newMealTemplate.f" />
                </div>
              </div>
              <button class="btn save-button mb-2" @click="addMealTemplate">
                <i class="mdi mdi-plus"></i>
                Add Template
              </button>
              <div class="d-flex flex-wrap gap-2">
                <div v-for="t in mealTemplates" :key="t.id"
                  class="badge text-bg-light p-2 d-flex align-items-center gap-2">
                  <div>
                    <div>{{ t.name }}</div>
                    <div class="text-muted">{{ t.calories }} kcal</div>
                  </div>
                  <button class="btn btn-xs btn-outline-primary" @click="applyMealTemplate(t)">Use</button>
                  <button class="btn btn-xs btn-outline-danger" @click="removeMealTemplate(t.id)">Remove</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-12 col-lg-6">
          <div class="card h-100 shadow-soft">
            <div class="card-body">
              <h6 class="mb-2">Workout Templates</h6>
              <div class="row g-2 mb-2">
                <div class="col-12 col-md-5">
                  <input class="form-control" placeholder="Activity" v-model.trim="newWorkoutTemplate.name" />
                </div>
                <div class="col-6 col-md-4">
                  <select class="form-select" v-model="newWorkoutTemplate.intensity">
                    <option value="easy">Easy</option>
                    <option value="moderate">Moderate</option>
                    <option value="vigorous">Vigorous</option>
                  </select>
                </div>
                <div class="col-6 col-md-3">
                  <input class="form-control" type="text" inputmode="numeric" placeholder="Min"
                    :value="newWorkoutTemplate.dur" @input="e => newWorkoutTemplate.dur = digitsOnly(e.target.value)" />
                </div>
              </div>
              <button class="btn save-button mb-2" @click="addWorkoutTemplate">
                <i class="mdi mdi-plus"></i>
                Add Template
              </button>
              <div class="d-flex flex-wrap gap-2">
                <div v-for="t in workoutTemplates" :key="t.id" class="badge text-bg-light p-2">
                  <span class="me-2">{{ t.name }} ({{ t.duration }}m, {{ t.intensity }})</span>
                  <button class="btn btn-xs btn-outline-primary me-1" @click="applyWorkoutTemplate(t)">Use</button>
                  <button class="btn btn-xs btn-outline-danger" @click="removeWorkoutTemplate(t.id)">Remove</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card shadow-soft mb-3 border-0 rounded-3">
        <div class="card-body">
          <h6 class="mb-3 d-flex align-items-center gap-2">
            <Activity class="text-secondary" :size="18" />
            Add Workout
          </h6>

          <div class="mb-3">
            <label class="form-label small text-muted">Select Activity</label>
            <div class="d-flex flex-wrap gap-2">
              <button v-for="a in QUICK_ACTIVITIES" :key="a.name" class="btn btn-sm rounded-pill px-3 py-1"
                :class="workoutForm.activity === a.name ? 'btn-secondary' : 'btn-outline-secondary'"
                @click="workoutForm.activity = a.name">
                {{ a.icon }} {{ a.name }}
              </button>
            </div>
          </div>

          <div class="mb-2">
            <label class="form-label small text-muted">Intensity</label>
            <div class="d-flex gap-2">
              <button class="btn btn-sm rounded-pill"
                :class="workoutForm.intensity === 'easy' ? 'btn-outline-secondary active' : 'btn-outline-secondary'"
                @click="workoutForm.intensity = 'easy'">Easy</button>
              <button class="btn btn-sm rounded-pill"
                :class="workoutForm.intensity === 'moderate' ? 'btn-outline-secondary active' : 'btn-outline-secondary'"
                @click="workoutForm.intensity = 'moderate'">Moderate</button>
              <button class="btn btn-sm rounded-pill"
                :class="workoutForm.intensity === 'vigorous' ? 'btn-outline-secondary active' : 'btn-outline-secondary'"
                @click="workoutForm.intensity = 'vigorous'">Vigorous</button>
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label small text-muted">Duration (minutes) and kcal (optional)</label>
            <div class="d-flex gap-2 flex-wrap align-items-center">
              <button v-for="d in QUICK_DURATIONS" :key="d" class="btn btn-sm rounded-pill"
                :class="String(workoutForm.minutes) === String(d) ? 'btn-secondary' : 'btn-outline-secondary'"
                @click="workoutForm.minutes = String(d)">
                {{ d }} min
              </button>
              <div class="input-group w-auto">
                <input type="text" inputmode="numeric" class="form-control form-control-sm rounded-pill text-center"
                  placeholder="Custom min" :value="workoutForm.minutes"
                  @input="e => workoutForm.minutes = digitsOnly(e.target.value)" style="width:110px;" />
              </div>
              <div class="input-group w-auto">
                <input type="text" inputmode="numeric" class="form-control form-control-sm rounded-pill text-center"
                  placeholder="kcal (optional)" :value="workoutForm.kcalOverride"
                  @input="e => workoutForm.kcalOverride = digitsOnly(e.target.value)" style="width:130px;" />
              </div>
            </div>
          </div>

          <div class="d-flex justify-content-between align-items-center mt-2 flex-wrap">
            <div class="small text-muted" v-if="workoutForm.activity && (previewMinutes || hasOverride)">
              <span class="fw-semibold text-dark">{{ workoutForm.activity }}</span>
              ({{ workoutForm.intensity }}) for
              <span class="fw-semibold">{{ previewMinutes || 0 }} min</span>
              ≈
              <span class="fw-bold text-success">{{ previewKcal }} kcal</span>
            </div>
            <button class="btn save-button ms-auto"
              :disabled="!workoutForm.activity || !(previewMinutes || hasOverride)" @click="addWorkout">
              <i class="mdi mdi-plus"></i>
              Add
            </button>
          </div>
        </div>
      </div>

      <div class="card shadow-soft mb-3">
        <div class="card-body">
          <h6 class="mb-3 d-flex align-items-center gap-2">
            <Activity class="text-secondary" :size="18" />
            Recurring Workouts
          </h6>

          <div class="row g-2 align-items-end">
            <div class="col-12 col-md-5">
              <label class="form-label small text-muted mb-1">Activity</label>
              <input class="form-control" v-model.trim="newSchedule.name" placeholder="e.g., Running" />
            </div>
            <div class="col-6 col-md-3">
              <label class="form-label small text-muted mb-1">Intensity</label>
              <select class="form-select" v-model="newSchedule.intensity">
                <option value="easy">Easy</option>
                <option value="moderate">Moderate</option>
                <option value="vigorous">Vigorous</option>
              </select>
            </div>
            <div class="col-6 col-md-2">
              <label class="form-label small text-muted mb-1">Minutes</label>
              <input class="form-control" type="text" inputmode="numeric" :value="newSchedule.minutes"
                @input="e => newSchedule.minutes = digitsOnly(e.target.value)" placeholder="e.g., 60" />
            </div>
            <div class="col-12 col-md-2 d-flex align-items-end">
              <button class="btn save-button w-100" @click="addSchedule">
                <i class="mdi mdi-plus"></i>
                Add Recurring
              </button>
            </div>
          </div>

          <div class="mt-2">
            <label class="form-label small text-muted mb-1">Days</label>
            <div class="d-flex gap-2 flex-nowrap overflow-auto py-1">
              <button v-for="d in weekDays" :key="d.val" type="button" class="btn btn-sm"
                :class="newSchedule.days.includes(d.val) ? 'day-btn-selected' : 'day-btn'"
                @click="toggleScheduleDay(d.val)">
                {{ d.label }}
              </button>
            </div>
          </div>

          <hr />
          <div v-if="schedules.length === 0" class="text-muted">No recurring workouts yet.</div>
          <ul v-else class="list-group">
            <li v-for="s in schedules" :key="s.id"
              class="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <div class="fw-semibold">
                  {{ s.name }} — {{ s.minutes }} min ({{ s.intensity }})
                </div>
                <div class="small text-secondary">
                  {{ s.days.join(", ") }}
                </div>
              </div>
              <button class="btn btn-sm cancel-button" @click="removeSchedule(s.id)">Remove</button>
            </li>
          </ul>
        </div>
      </div>

      <div class="card shadow-soft mb-4">
        <div class="card-body">
          <h6 class="mb-3 d-flex align-items-center gap-2">
            <Activity class="text-info" :size="18" />
            Today's Workouts
          </h6>
          <div v-if="!userId" class="text-muted">Sign in to log workouts.</div>
          <div v-else-if="workoutsSorted.length === 0" class="text-muted">No workouts yet.</div>
          <ul class="list-group">
            <li v-for="w in workoutsSorted" :key="w.id"
              class="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <div class="fw-semibold">{{ w.activity }}</div>
                <div class="small text-secondary">
                  {{ w.minutes }} minutes • {{ w.kcal }} kcal • {{ w.intensity }}
                </div>
              </div>
              <button class="btn btn-sm cancel-button" @click="removeWorkout(w.id)">Delete</button>
            </li>
          </ul>
          <div class="mt-3 small">
            <strong>Totals:</strong>
            {{ totalsWorkouts.minutes }} min • {{ totalsWorkouts.kcal }} kcal
          </div>
        </div>
      </div>

      <div ref="toastRef" class="toast position-fixed bottom-0 start-50 translate-middle-x m-3" role="alert"
        aria-live="assertive" aria-atomic="true" data-bs-delay="3000" data-bs-autohide="true">
        <div class="toast-body">
          {{ toastMessage }}
        </div>
      </div>

      <div class="modal fade" :class="{ show: generalDialog, 'd-block': generalDialog }" tabindex="-1"
        style="background-color: rgba(0,0,0,0.5);">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">
                <i class="mdi mdi-alert-circle-outline me-2"></i>
                Confirm
              </h5>
              <button type="button" class="btn-close btn-close-white" @click="closeGeneralDialog"></button>
            </div>
            <div class="modal-body">
              <p class="mb-0">{{ dialogMessage }}</p>
            </div>
            <div class="modal-footer">
              <button class="btn cancel-button" @click="closeGeneralDialog">Close</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
h1 {
  background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.toast {
  background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.text-gradient {
  background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.card {
  border: none;
  border-radius: 0.75rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
  background-color: #f5f5f5;
  overflow: hidden;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.05);
}

.form-control,
.form-select {
  border: 1px solid #ced4da;
}

.list-group-item {
  border: 0;
}

.ios-switch-container {
  display: flex;
  align-items: center;
  margin-bottom: 0;
}

.ios-switch-input {
  display: none;
}

.ios-switch-label {
  position: relative;
  display: inline-block;
  width: 42px;
  height: 24px;
  cursor: pointer;
  margin: 0;
}

.ios-switch-slider {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #e0e0e0;
  border-radius: 24px;
  transition: all 0.3s ease;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.ios-switch-slider::before {
  content: "";
  position: absolute;
  height: 20px;
  width: 20px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  border-radius: 50%;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.ios-switch-input:checked+.ios-switch-label .ios-switch-slider {
  background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
}

.ios-switch-input:checked+.ios-switch-label .ios-switch-slider::before {
  transform: translateX(18px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

.ios-switch-label:hover .ios-switch-slider {
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.ios-switch-input:active+.ios-switch-label .ios-switch-slider::before {
  width: 24px;
}

.ios-switch-input:focus+.ios-switch-label .ios-switch-slider {
  outline: 2px solid #667eea;
  outline-offset: 2px;
}

.ios-switch-input:disabled+.ios-switch-label {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-header {
  background: #667eea;
  color: white;
}

.modal input,
.modal select,
.modal textarea {
  border: 1px solid black;
  border-radius: 3px;
}

.save-button {
  background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 20px;
  transition: all 0.3s ease;
}

.save-button:hover {
  background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  border: 1px solid lightgray;
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
  transform: translateY(-3px);
  transition: all 0.3s ease;
}

.cancel-button {
  background: linear-gradient(120deg, #ff6b6b 0%, #ee5a6f 100%);
  color: white;
  border-radius: 20px;
  transition: all 0.3s ease;
}

.cancel-button:hover {
  background: linear-gradient(120deg, #ff6b6b 0%, #ee5a6f 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  border: 1px solid lightgray;
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
  transform: translateY(-3px);
  transition: all 0.3s ease;
}

.close-button {
  background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
  border: 1px solid black;
  border-radius: 3px;
  color: white;
  transition: all 0.3s ease;
}

.close-button:hover {
  background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  border: 1px solid black;
  box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
  transform: translateY(-3px);
  transition: all 0.3s ease;
}

.nav-btn-group {
  border-radius: 20px;
  background: white;
  padding: 3px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.nav-btn {
  background: transparent;
  color: #667eea;
  border: none;
  padding: 0.375rem 0.75rem;
  font-weight: 500;
  transition: all 0.2s ease;
  border-radius: 6px;
}

.nav-btn:hover {
  background: #f3f4f6;
  color: #764ba2;
}

.day-btn {
  background: #f8f9fa;
  border: 1px solid #e5e7eb;
  color: #374151;
  border-radius: 9999px;
  padding: 4px 10px;
}

.day-btn-selected {
  background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 9999px;
  padding: 4px 10px;
  box-shadow: 0 4px 10px rgba(102, 126, 234, 0.3);
}

.goal-btn-group {
  display: flex;
  gap: 0.5rem;
  width: 100%;
  background: #f8f9fa;
  padding: 0.5rem;
  border-radius: 12px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.goal-btn-group {
  display: flex;
  gap: 0.5rem;
  width: 100%;
  background: #f8f9fa;
  padding: 0.5rem;
  border-radius: 12px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.goal-btn {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 2px solid transparent;
  border-radius: 8px;
  background: white;
  color: #667eea;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.goal-btn:hover {
  background: #f0f2ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
}

.goal-btn.active {
  background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: #667eea;
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.35);
}

.goal-btn.active:hover {
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
}

/* Responsive */
@media (max-width: 576px) {
  .goal-btn {
    padding: 0.6rem 0.5rem;
    font-size: 0.85rem;
  }

  .goal-btn i {
    display: none;
  }
}

.shadow-soft {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
}

.pb-protein {
  background: linear-gradient(120deg, #0d6efd 0%, #0056b3 100%);
}

.pb-carbs {
  background: linear-gradient(120deg, #198754 0%, #145235 100%);
}

.pb-fat {
  background: linear-gradient(120deg, #ffc107 0%, #fd7e14 100%);
}
</style>