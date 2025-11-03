<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import { db, auth } from "@/firebase";
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, where, serverTimestamp, setDoc, deleteField } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Calendar, Flame, TrendingUp, Activity, Utensils, Clock, Plus, ChevronLeft, ChevronRight } from "lucide-vue-next";

function toISO(d){const m=String(d.getMonth()+1).padStart(2,"0");const day=String(d.getDate()).padStart(2,"0");return`${d.getFullYear()}-${m}-${day}`;}
function fmtDate(d){return new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric"});}
const digitsOnly=(s)=>(s??"").replace(/\D+/g,"");
const n=(x)=> (Number.isFinite(Number(x)) ? Number(x) : 0);

const METS={Walking:{easy:2.8,moderate:3.3,vigorous:4.5},Running:{easy:7,moderate:8.3,vigorous:11},Cycling:{easy:4,moderate:6,vigorous:8.5},Swimming:{easy:6,moderate:7,vigorous:9.8},Gym:{easy:3,moderate:5,vigorous:6},Yoga:{easy:2,moderate:2.5,vigorous:3}};
function metFor(activity,intensity="moderate"){return METS[activity]?.[intensity] ?? 3.5;}
function kcalFrom(activity,intensity,kg,minutes){const met=metFor(activity,intensity);return Math.round((met*3.5*kg/200)*minutes);}

const selectedDate = ref(toISO(new Date()));
const userId = ref(null);

const initialUseAuto = String(localStorage.getItem("useAutoCalorie") ?? "true") !== "false";
const initialManualStr = localStorage.getItem("calorieTarget") ?? "";

const targets = ref({
  heightCm: Number(localStorage.getItem("heightCm")) || null,
  weightKg: Number(localStorage.getItem("weightKg")) || null,
  calorieTarget: initialUseAuto ? null : (n(initialManualStr) || null)
});
const goal = ref(localStorage.getItem("goal") || "maintenance");
const useAutoCalorie = ref(initialUseAuto);
const calorieInput = ref(initialUseAuto ? "" : initialManualStr);

let unsubProfile = null;
let syncingProfile = false;
const profileReady = ref(false);

const kcalInputRef = ref(null);

function bindProfile(){
  if (unsubProfile) unsubProfile();
  if (!userId.value){ profileReady.value=false; return; }
  const refDoc = doc(db, "profiles", userId.value);
  unsubProfile = onSnapshot(refDoc, (snap)=>{
    profileReady.value = true;
    syncingProfile = true;
    if (snap.exists()){
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

async function saveProfile(partial){
  if (!userId.value || !profileReady.value || syncingProfile) return;
  try{ await setDoc(doc(db, "profiles", userId.value), { ...partial, updatedAt: serverTimestamp() }, { merge: true }); }catch(e){}
}

const mealForm = ref({ type:"Breakfast", name:"", kcal:"", protein:null, carbs:null, fat:null });
const meals = ref([]); let unsubMeals = null;

const calculatedCalories = computed(() => {
  const p = n(mealForm.value.protein);
  const c = n(mealForm.value.carbs);
  const f = n(mealForm.value.fat);
  // Precise Atwater factors: Protein=4.1, Carbs=4.1, Fat=9.3 kcal/g
  return Math.round(p * 4.1 + c * 4.1 + f * 9.3);
});

const calculatedTemplateCalories = computed(() => {
  const p = n(newMealTemplate.value.p);
  const c = n(newMealTemplate.value.c);
  const f = n(newMealTemplate.value.f);
  // Precise Atwater factors: Protein=4.1, Carbs=4.1, Fat=9.3 kcal/g
  return Math.round(p * 4.1 + c * 4.1 + f * 9.3);
});

const workoutForm = ref({ activity:"", minutes:"", intensity:"moderate" });
const workouts = ref([]); let unsubWorkouts = null;

const mealsSorted = computed(()=>[...meals.value].sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)));
const workoutsSorted = computed(()=>[...workouts.value].sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)));

const mealTemplates = ref(JSON.parse(localStorage.getItem("mealTemplates") || "[]"));
const workoutTemplates = ref(JSON.parse(localStorage.getItem("workoutTemplates") || "[]"));

const proteinTarget = computed(()=> goal.value==="muscle-gain" ? 150 : goal.value==="weight-loss" ? 120 : 130);
const carbsTarget   = computed(()=> goal.value==="muscle-gain" ? 300 : goal.value==="weight-loss" ? 180 : 250);
const fatTarget     = computed(()=> goal.value==="muscle-gain" ? 70  : goal.value==="weight-loss" ? 50  : 65 );

onMounted(()=>{ onAuthStateChanged(auth,(u)=>{ userId.value=u?.uid ?? null; bindAll(); }); });
onBeforeUnmount(()=>{ if (unsubMeals) unsubMeals(); if (unsubWorkouts) unsubWorkouts(); if (unsubProfile) unsubProfile(); });
watch(selectedDate, bindAll);

watch(mealTemplates,(v)=>localStorage.setItem("mealTemplates",JSON.stringify(v)),{deep:true});
watch(workoutTemplates,(v)=>localStorage.setItem("workoutTemplates",JSON.stringify(v)),{deep:true});

watch(()=>targets.value.heightCm,(v,ov)=>{ if(v===ov) return; localStorage.setItem("heightCm", String(v ?? "")); saveProfile({ heightCm: v ?? null }); });
watch(()=>targets.value.weightKg,(v,ov)=>{ if(v===ov) return; localStorage.setItem("weightKg", String(v ?? "")); saveProfile({ weightKg: v ?? null }); });
watch(goal,(g,og)=>{ if(g===og) return; localStorage.setItem("goal", g); saveProfile({ goal: g }); });

watch(calorieInput, (v, ov) => {
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

function bindAll(){
  if(!userId.value){
    meals.value=[]; workouts.value=[];
    if (unsubMeals) unsubMeals(); if (unsubWorkouts) unsubWorkouts(); if (unsubProfile) unsubProfile();
    return;
  }
  bindProfile();
  bindMeals();
  bindWorkouts();
}
function bindMeals(){
  if (unsubMeals) unsubMeals();
  const refCol=collection(db,"meals");
  const qy=query(refCol,where("userId","==",userId.value),where("date","==",selectedDate.value));
  unsubMeals=onSnapshot(qy,snap=>{meals.value=snap.docs.map(d=>({id:d.id,...d.data()}));});
}
function bindWorkouts(){
  if (unsubWorkouts) unsubWorkouts();
  const refCol=collection(db,"workouts");
  const qy=query(refCol,where("userId","==",userId.value),where("date","==",selectedDate.value));
  unsubWorkouts=onSnapshot(qy,snap=>{workouts.value=snap.docs.map(d=>({id:d.id,...d.data()}));});
}

async function addMeal(){
  if(!userId.value) return;
  if(!mealForm.value.name.trim() || calculatedCalories.value<=0) return;
  const refCol=collection(db,"meals");
  await addDoc(refCol,{
    userId:userId.value,
    type:mealForm.value.type,
    name:mealForm.value.name.trim(),
    kcal:calculatedCalories.value,
    protein:n(mealForm.value.protein),
    carbs:n(mealForm.value.carbs),
    fat:n(mealForm.value.fat),
    date:selectedDate.value,
    createdAt:serverTimestamp()
  });
  mealForm.value={type:"Breakfast",name:"",kcal:"",protein:null,carbs:null,fat:null};
}
async function removeMeal(id){ if(!userId.value) return; await deleteDoc(doc(db,"meals",id)); }

async function addWorkout(){
  if (!userId.value) return;

  const mins = Number(String(workoutForm.value.minutes).trim());
  const activity = (workoutForm.value.activity || "").trim();
  if (!activity || !Number.isFinite(mins) || mins <= 0) return;

  const kg = n(targets.value.weightKg) || 70; // fallback so add never blocks
  const met = metFor(activity, workoutForm.value.intensity);
  const kcal = Math.round((met * 3.5 * kg / 200) * mins);

  const refCol = collection(db, "workouts");
  await addDoc(refCol, {
    userId: userId.value,
    activity,
    minutes: mins,
    intensity: workoutForm.value.intensity,
    met,
    kcal,
    date: selectedDate.value,
    createdAt: serverTimestamp()
  });

  workoutForm.value = { activity: "", minutes: "", intensity: "moderate" };
}

async function removeWorkout(id){ if(!userId.value) return; await deleteDoc(doc(db,"workouts",id)); }

const totalsMeals = computed(()=>({
  kcal:meals.value.reduce((a,m)=>a+n(m.kcal),0),
  protein:meals.value.reduce((a,m)=>a+n(m.protein),0),
  carbs:meals.value.reduce((a,m)=>a+n(m.carbs),0),
  fat:meals.value.reduce((a,m)=>a+n(m.fat),0)
}));
const totalsWorkouts = computed(()=>({
  minutes:workouts.value.reduce((a,w)=>a+n(w.minutes),0),
  kcal:workouts.value.reduce((a,w)=>a+n(w.kcal),0)
}));
const netCalories = computed(()=>totalsMeals.value.kcal - totalsWorkouts.value.kcal);

const suggestedCalorie = computed(() => {
  const kg = n(targets.value.weightKg);
  const base = kg>0 ? Math.round(30*kg) : 2000;
  if (goal.value === "weight-loss")  return Math.round(base*0.85);
  if (goal.value === "muscle-gain")  return Math.round(base*1.10);
  return base;
});
const effectiveCalorieTarget = computed(() => {
  if (useAutoCalorie.value) return suggestedCalorie.value;
  const explicit = n(targets.value.calorieTarget);
  return explicit > 0 ? explicit : suggestedCalorie.value;
});
const overCals = computed(()=> netCalories.value - effectiveCalorieTarget.value);

const carbsGap   = computed(()=> Math.max(0, carbsTarget.value   - totalsMeals.value.carbs));
const fatGap     = computed(()=> Math.max(0, fatTarget.value     - totalsMeals.value.fat));
const proteinGap = computed(()=> Math.max(0, proteinTarget.value - totalsMeals.value.protein));

const suggestions = computed(()=>{
  const s=[];
  if(goal.value==="weight-loss"){
    if(overCals.value>0)s.push({type:"burn",text:`Burn ~${overCals.value} kcal to reach today’s target.`});
    if(proteinGap.value>0)s.push({type:"eat",text:`Aim for +${proteinGap.value.toFixed(0)} g protein.`});
  } else if(goal.value==="muscle-gain"){
    if(proteinGap.value>0)s.push({type:"eat",text:`Eat +${proteinGap.value.toFixed(0)} g protein.`});
    if(overCals.value<0)s.push({type:"eat",text:`You’re under by ${Math.abs(overCals.value)} kcal — add a snack.`});
  } else {
    if(Math.abs(overCals.value)>150)s.push({type:"balance",text:`Adjust by ${Math.abs(overCals.value)} kcal to hit maintenance.`});
  }
  if(overCals.value>0){
    const kg=n(targets.value.weightKg)||1;
    const acts=[{name:"Walk",i:"moderate"},{name:"Cycle",i:"moderate"},{name:"Running",i:"easy"}];
    const extra=acts.map(a=>{
      const m=metFor(a.name,a.i);
      const perMin=(m*3.5*kg)/200;
      const mins=perMin>0?Math.ceil(overCals.value/perMin):0;
      return`${a.name} ~${mins} min`;
    }).join(" • ");
    s.push({type:"burn",text:extra});
  }
  return s;
});

const mealSearch=ref(""); const mealResults=ref([]); const searching=ref(false);
async function searchFoods(){
  const q=mealSearch.value.trim(); if(!q){mealResults.value=[];return;}
  searching.value=true;
  try{
    const url=`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=12&lang=en&fields=product_name,product_name_en,brands,nutriments,languages_tags`;
    const res=await fetch(url,{headers:{"Accept-Language":"en"}});
    const json=await res.json();
    const prods=Array.isArray(json.products)?json.products:[];
    const lcq=q.toLowerCase();
    mealResults.value=prods.map(p=>{
      const name=p.product_name_en?.trim()||p.product_name?.trim()||"(Unnamed)";
      return{
        name,brand:p.brands||"",
        kcal100:p.nutriments?.["energy-kcal_100g"]??0,
        p100:p.nutriments?.["proteins_100g"]??0,
        c100:p.nutriments?.["carbohydrates_100g"]??0,
        f100:p.nutriments?.["fat_100g"]??0,
        langs:p.languages_tags||[]
      };
    }).filter(r=>r.name.toLowerCase().includes(lcq)||r.langs.includes("en:english"));
  }catch{mealResults.value=[];}finally{searching.value=false;}
}
function useResult(r, autoAdd = false) {
  const raw = prompt(`How many grams? (per 100g: ${r.kcal100 || 0} kcal)`, "100");
  if (raw === null) return;
  const grams = Number(String(raw).trim());
  if (!Number.isFinite(grams) || grams <= 0) return;
  const f = grams / 100;
  mealForm.value.name   = r.brand ? `${r.name} (${r.brand})` : r.name;
  mealForm.value.kcal   = Math.round((r.kcal100 || 0) * f).toString();
  mealForm.value.protein = +((r.p100 || 0) * f).toFixed(1);
  mealForm.value.carbs   = +((r.c100 || 0) * f).toFixed(1);
  mealForm.value.fat     = +((r.f100 || 0) * f).toFixed(1);
  mealResults.value = [];
  mealSearch.value = "";
  if (autoAdd) addMeal();
}

const newMealTemplate=ref({name:"",kcal:"",p:"",c:"",f:""});
function addMealTemplate(){
  if(!newMealTemplate.value.name||calculatedTemplateCalories.value<=0)return;
  mealTemplates.value.push({
    id:Date.now().toString(),
    name:newMealTemplate.value.name.trim(),
    calories:calculatedTemplateCalories.value,
    protein:Number(newMealTemplate.value.p)||0,
    carbs:Number(newMealTemplate.value.c)||0,
    fat:Number(newMealTemplate.value.f)||0
  });
  newMealTemplate.value={name:"",kcal:"",p:"",c:"",f:""};
}
function removeMealTemplate(id){mealTemplates.value=mealTemplates.value.filter(t=>t.id!==id);}
function applyWorkoutTemplate(t){workoutForm.value.activity=t.name;workoutForm.value.intensity=t.intensity;workoutForm.value.minutes=String(t.duration);}
function applyMealTemplate(t){mealForm.value.name=t.name;mealForm.value.kcal=String(t.calories);mealForm.value.protein=t.protein;mealForm.value.carbs=t.carbs;mealForm.value.fat=t.fat;}

const newWorkoutTemplate=ref({name:"",intensity:"moderate",dur:""});
function addWorkoutTemplate(){
  if(!newWorkoutTemplate.value.name||!Number(newWorkoutTemplate.value.dur))return;
  workoutTemplates.value.push({id:Date.now().toString(),name:newWorkoutTemplate.value.name.trim(),intensity:newWorkoutTemplate.value.intensity,duration:Number(newWorkoutTemplate.value.dur)});
  newWorkoutTemplate.value={name:"",intensity:"moderate",dur:""};
}
function removeWorkoutTemplate(id){workoutTemplates.value=workoutTemplates.value.filter(t=>t.id!==id);}

const QUICK_ACTIVITIES=[{name:"Walking",icon:"🚶"},{name:"Running",icon:"🏃"},{name:"Cycling",icon:"🚴"},{name:"Swimming",icon:"🏊"},{name:"Gym",icon:"💪"},{name:"Yoga",icon:"🧘"}];
const QUICK_DURATIONS=[15,30,45,60];

function changeDate(days){const d=new Date(selectedDate.value);d.setDate(d.getDate()+days);selectedDate.value=toISO(d);}
</script>

<template>
  <section class="container py-3">
    <div class="d-flex align-items-center justify-content-between mb-3">
      <h1 class="h4 mb-0 fw-bold text-gradient">Fuel &amp; Move</h1>
      <div class="d-flex align-items-center gap-2 bg-light rounded-3 px-2 py-1 border">
        <button class="btn btn-sm btn-link text-decoration-none" @click="changeDate(-1)"><ChevronLeft :size="18"/></button>
        <div class="d-flex align-items-center gap-2 px-2">
          <Calendar :size="16" class="text-secondary" />
          <span class="fw-semibold small">{{ fmtDate(selectedDate) }}</span>
        </div>
        <button class="btn btn-sm btn-link text-decoration-none" @click="changeDate(1)"><ChevronRight :size="18"/></button>
      </div>
    </div>

    <div class="row g-3 mb-3">
      <div class="col-12 col-md-6">
        <div class="card h-100 shadow-sm">
          <div class="card-body d-flex align-items-center justify-content-around">
            <div class="text-center"><Flame class="text-primary mb-2" :size="24"/><div class="fw-bold">{{ totalsMeals.kcal }}</div><div class="small text-muted">Meals kcal</div></div>
            <div class="text-center"><Activity class="text-success mb-2" :size="24"/><div class="fw-bold">{{ totalsWorkouts.minutes }}</div><div class="small text-muted">Workout min</div></div>
            <div class="text-center"><TrendingUp class="text-info mb-2" :size="24"/><div class="fw-bold">{{ totalsWorkouts.kcal }}</div><div class="small text-muted">Burned kcal</div></div>
            <div class="text-center"><Utensils class="text-dark mb-2" :size="24"/><div class="fw-bold">{{ netCalories }}</div><div class="small text-muted">Net kcal</div></div>
          </div>
        </div>
      </div>
      <div class="col-12 col-md-6">
        <div class="card h-100 shadow-sm">
          <div class="card-body">
            <h6 class="mb-3 d-flex align-items-center gap-2"><TrendingUp class="text-primary" :size="18" />Macros</h6>
            <div class="mb-2">
              <div class="d-flex justify-content-between small"><span>Protein</span><span>{{ totalsMeals.protein }} g / {{ proteinTarget }} g</span></div>
              <div class="progress"><div class="progress-bar bg-primary" :style="{width: Math.min(100,(totalsMeals.protein/proteinTarget)*100)+'%'}"></div></div>
            </div>
            <div class="mb-2">
              <div class="d-flex justify-content-between small"><span>Carbs</span><span>{{ totalsMeals.carbs }} g / {{ carbsTarget }} g</span></div>
              <div class="progress"><div class="progress-bar bg-info" :style="{width: Math.min(100,(totalsMeals.carbs/carbsTarget)*100)+'%'}"></div></div>
            </div>
            <div>
              <div class="d-flex justify-content-between small"><span>Fat</span><span>{{ totalsMeals.fat }} g / {{ fatTarget }} g</span></div>
              <div class="progress"><div class="progress-bar bg-warning" :style="{width: Math.min(100,(totalsMeals.fat/fatTarget)*100)+'%'}"></div></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card shadow-sm mb-3">
      <div class="card-body">
        <div class="row g-2 align-items-end">
          <div class="col-12 col-md-5">
            <label class="form-label">Goal</label>
            <div class="btn-group w-100">
              <button class="btn" :class="goal==='weight-loss'?'btn-primary':'btn-outline-primary'" @click="goal='weight-loss'">Weight loss</button>
              <button class="btn" :class="goal==='maintenance'?'btn-primary':'btn-outline-primary'" @click="goal='maintenance'">Maintenance</button>
              <button class="btn" :class="goal==='muscle-gain'?'btn-primary':'btn-outline-primary'" @click="goal='muscle-gain'">Muscle gain</button>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <label class="form-label">Height (cm)</label>
            <input type="number" min="1" class="form-control" v-model.number="targets.heightCm" placeholder="e.g., 175"/>
          </div>
          <div class="col-6 col-md-2">
            <label class="form-label">Weight (kg)</label>
            <input type="number" min="1" class="form-control" v-model.number="targets.weightKg" placeholder="e.g., 70"/>
          </div>
          <div class="col-12 col-md-2">
            <label class="form-label d-flex align-items-center justify-content-between">
              <span>Calorie Target</span>
              <div class="form-check form-switch m-0">
                <input class="form-check-input" type="checkbox" id="autoKcal" v-model="useAutoCalorie">
                <label class="form-check-label small ms-2" for="autoKcal">Auto</label>
              </div>
            </label>

            <input
              v-if="useAutoCalorie"
              type="number"
              class="form-control"
              :value="suggestedCalorie"
              disabled
            />

            <input
              v-else
              ref="kcalInputRef"
              type="number"
              min="0"
              class="form-control"
              v-model="calorieInput"
              placeholder="e.g., 2000"
              @keydown.stop
              @keyup.stop
              @keypress.stop
            />

          </div>
        </div>
      </div>
    </div>

    <div class="card shadow-sm mb-3">
      <div class="card-body">
        <h6 class="mb-2 d-flex align-items-center gap-2"><Clock class="text-secondary" :size="18"/>Suggestions</h6>
        <div v-if="suggestions.length===0" class="text-success">You're tracking well — no action needed.</div>
        <ul v-else class="list-unstyled mb-0">
          <li v-for="(s,i) in suggestions" :key="i" class="mb-1">• {{ s.text }}</li>
        </ul>
      </div>
    </div>

    <div class="card shadow-sm mb-3">
      <div class="card-body">
        <label class="form-label">Search foods (OpenFoodFacts)</label>
        <div class="input-group">
          <input class="form-control" v-model="mealSearch" @keyup.enter="searchFoods" placeholder="e.g., chicken rice"/>
          <button class="btn btn-outline-secondary" @click="searchFoods" :disabled="searching">{{ searching?'Searching…':'Search' }}</button>
        </div>
        <ul v-if="mealResults.length" class="list-group mt-2">
          <li v-for="r in mealResults" :key="r.name+r.brand" class="list-group-item d-flex justify-content-between align-items-center">
            <div class="me-2">
              <div class="fw-semibold">{{ r.name }}</div>
              <div class="small text-secondary" v-if="r.brand">{{ r.brand }}</div>
              <div class="small text-muted">per 100g: {{ r.kcal100||0 }} kcal • P{{ r.p100||0 }} C{{ r.c100||0 }} F{{ r.f100||0 }}</div>
            </div>
            <button class="btn btn-sm btn-primary" @click="useResult(r, true)">Add</button>
          </li>
        </ul>
        <div v-else-if="searching" class="small text-muted mt-2">Searching…</div>
      </div>
    </div>

    <div class="row g-3 mb-3">
      <div class="col-12 col-lg-6">
        <div class="card h-100 shadow-sm">
          <div class="card-body">
            <h6 class="mb-2">Meal Templates</h6>
            <div class="row g-2 mb-2 align-items-end">
              <div class="col-12 col-md-4">
                <label class="form-label small text-muted mb-1">Template Name</label>
                <input class="form-control" placeholder="e.g., Protein Shake" v-model.trim="newMealTemplate.name"/>
              </div>
              <div class="col-3 col-md-2">
                <label class="form-label small text-muted mb-1">Calories (auto)</label>
                <input class="form-control bg-light" type="number" placeholder="0" :value="calculatedTemplateCalories" readonly/>
              </div>
              <div class="col-3 col-md-2">
                <label class="form-label small text-muted mb-1">Protein (g)</label>
                <input class="form-control" type="number" min="0" placeholder="0" v-model.number="newMealTemplate.p"/>
              </div>
              <div class="col-3 col-md-2">
                <label class="form-label small text-muted mb-1">Carbs (g)</label>
                <input class="form-control" type="number" min="0" placeholder="0" v-model.number="newMealTemplate.c"/>
              </div>
              <div class="col-3 col-md-2">
                <label class="form-label small text-muted mb-1">Fat (g)</label>
                <input class="form-control" type="number" min="0" placeholder="0" v-model.number="newMealTemplate.f"/>
              </div>
            </div>
            <button class="btn btn-sm btn-dark mb-2" @click="addMealTemplate"><Plus :size="14" class="me-1"/>Add template</button>
            <div class="d-flex flex-wrap gap-2">
              <div v-for="t in mealTemplates" :key="t.id" class="badge text-bg-light p-2 d-flex align-items-center gap-2">
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
        <div class="card h-100 shadow-sm">
          <div class="card-body">
            <h6 class="mb-2">Workout Templates</h6>
            <div class="row g-2 mb-2">
              <div class="col-12 col-md-5"><input class="form-control" placeholder="Activity" v-model.trim="newWorkoutTemplate.name"/></div>
              <div class="col-6 col-md-4">
                <select class="form-select" v-model="newWorkoutTemplate.intensity">
                  <option value="easy">Easy</option>
                  <option value="moderate">Moderate</option>
                  <option value="vigorous">Vigorous</option>
                </select>
              </div>
              <div class="col-6 col-md-3"><input class="form-control" type="text" inputmode="numeric" placeholder="Min" :value="newWorkoutTemplate.dur" @input="e=>newWorkoutTemplate.dur=digitsOnly(e.target.value)"/></div>
            </div>
            <button class="btn btn-sm btn-dark mb-2" @click="addWorkoutTemplate"><Plus :size="14" class="me-1"/>Add template</button>
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

    <div class="card shadow-sm mb-3 border-0 rounded-3">
      <div class="card-body">
        <h6 class="mb-3 d-flex align-items-center gap-2">
          <Utensils class="text-primary" :size="18" />
          <span>Add Meal</span>
        </h6>
        <div class="row g-3 align-items-end">
          <div class="col-12 col-md-3">
            <label class="form-label small text-muted">Meal Type</label>
            <select class="form-select rounded-pill" v-model="mealForm.type">
              <option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Snack</option>
            </select>
          </div>
          <div class="col-12 col-md-4">
            <label class="form-label small text-muted">Meal Name</label>
            <input class="form-control rounded-pill" placeholder="e.g., Chicken Rice" v-model.trim="mealForm.name" />
          </div>
          <div class="col-4 col-md-1">
            <label class="form-label small text-muted">kcal (auto)</label>
            <input type="number" class="form-control text-center rounded-pill bg-light" placeholder="0" :value="calculatedCalories" readonly />
          </div>
          <div class="col-4 col-md-1">
            <label class="form-label small text-muted">P (g)</label>
            <input type="number" class="form-control text-center rounded-pill" v-model="mealForm.protein" />
          </div>
          <div class="col-4 col-md-1">
            <label class="form-label small text-muted">C (g)</label>
            <input type="number" class="form-control text-center rounded-pill" v-model="mealForm.carbs" />
          </div>
          <div class="col-4 col-md-1">
            <label class="form-label small text-muted">F (g)</label>
            <input type="number" class="form-control text-center rounded-pill" v-model="mealForm.fat" />
          </div>
          <div class="col-12 col-md-1 d-grid">
            <button class="btn btn-dark rounded-pill" :disabled="!mealForm.name || calculatedCalories <= 0" @click="addMeal">
              <Plus :size="16" class="me-1" /> Add
            </button>
          </div>
        </div>
        <div class="form-text mt-2 text-muted">Tip: use “Use” from templates or search OpenFoodFacts to auto-fill.</div>
      </div>
    </div>

    <div class="card shadow-sm mb-3">
      <div class="card-body">
        <h6 class="mb-3 d-flex align-items-center gap-2"><Utensils class="text-secondary" :size="18" />Today's Meals</h6>
        <div v-if="!userId" class="text-muted">Sign in to log meals.</div>
        <div v-else-if="mealsSorted.length===0" class="text-muted">No meals yet.</div>
        <ul class="list-group">
          <li v-for="m in mealsSorted" :key="m.id" class="list-group-item d-flex justify-content-between align-items-center">
            <div><div class="fw-semibold">{{ m.name }}</div><div class="small text-secondary">{{ m.type }} • {{ m.kcal }} kcal • {{ m.protein }}g Protein • {{ m.carbs }}g Carbs • {{ m.fat }}g Fat</div></div>
            <button class="btn btn-sm btn-outline-danger" @click="removeMeal(m.id)">Delete</button>
          </li>
        </ul>
      </div>
    </div>

    <div class="card shadow-sm mb-3 border-0 rounded-3">
      <div class="card-body">
        <h6 class="mb-3 d-flex align-items-center gap-2">
          <Activity class="text-secondary" :size="18" />
          <span>Add Workout</span>
        </h6>

        <div class="mb-3">
          <label class="form-label small text-muted">Select Activity</label>
          <div class="d-flex flex-wrap gap-2">
            <button v-for="a in QUICK_ACTIVITIES" :key="a.name"
              class="btn btn-sm rounded-pill px-3 py-1"
              :class="workoutForm.activity===a.name ? 'btn-secondary' : 'btn-outline-secondary'"
              @click="workoutForm.activity=a.name">
              {{ a.icon }} {{ a.name }}
            </button>
          </div>
        </div>

        <div class="mb-2">
          <label class="form-label small text-muted">Intensity</label>
          <div class="d-flex gap-2">
            <button class="btn btn-sm rounded-pill" :class="workoutForm.intensity==='easy'?'btn-outline-secondary active':'btn-outline-secondary'" @click="workoutForm.intensity='easy'">Easy</button>
            <button class="btn btn-sm rounded-pill" :class="workoutForm.intensity==='moderate'?'btn-outline-secondary active':'btn-outline-secondary'" @click="workoutForm.intensity='moderate'">Moderate</button>
            <button class="btn btn-sm rounded-pill" :class="workoutForm.intensity==='vigorous'?'btn-outline-secondary active':'btn-outline-secondary'" @click="workoutForm.intensity='vigorous'">Vigorous</button>
          </div>
        </div>

        <div class="mb-3">
          <label class="form-label small text-muted">Duration (minutes)</label>
          <div class="d-flex gap-2 flex-wrap align-items-center">
            <button v-for="d in QUICK_DURATIONS" :key="d" class="btn btn-sm rounded-pill" :class="String(workoutForm.minutes)===String(d)?'btn-secondary':'btn-outline-secondary'" @click="workoutForm.minutes=String(d)">{{ d }} min</button>
            <div class="input-group w-auto">
              <input type="text" inputmode="numeric" class="form-control form-control-sm rounded-pill text-center" placeholder="Custom" v-model="workoutForm.minutes" style="width:90px;" />
            </div>
          </div>
        </div>

        <div class="d-flex justify-content-between align-items-center mt-2 flex-wrap">
          <div class="small text-muted" v-if="workoutForm.activity && workoutForm.minutes">
            <span class="fw-semibold text-dark">{{ workoutForm.activity }}</span>
            ({{ workoutForm.intensity }}) for <span class="fw-semibold">{{ workoutForm.minutes }} min</span> ≈
            <span class="fw-bold text-success">{{ kcalFrom(workoutForm.activity, workoutForm.intensity, Number(targets.weightKg), Number(workoutForm.minutes)) }} kcal</span>
          </div>
          <button class="btn btn-success rounded-pill ms-auto" :disabled="!workoutForm.activity || !Number(workoutForm.minutes)" @click="addWorkout">
            <Plus :size="16" class="me-1" /> Add
          </button>
        </div>
      </div>
    </div>

    <div class="card shadow-sm mb-4">
      <div class="card-body">
        <h6 class="mb-3 d-flex align-items-center gap-2"><Activity class="text-info" :size="18" />Today's Workouts</h6>
        <div v-if="!userId" class="text-muted">Sign in to log workouts.</div>
        <div v-else-if="workoutsSorted.length===0" class="text-muted">No workouts yet.</div>
        <ul class="list-group">
          <li v-for="w in workoutsSorted" :key="w.id" class="list-group-item d-flex justify-content-between align-items-center">
            <div><div class="fw-semibold">{{ w.activity }}</div><div class="small text-secondary">{{ w.minutes }} minutes • {{ w.kcal }} kcal • {{ w.intensity }}</div></div>
            <button class="btn btn-sm btn-outline-danger" @click="removeWorkout(w.id)">Delete</button>
          </li>
        </ul>
        <div class="mt-3 small"><strong>Totals:</strong> {{ totalsWorkouts.minutes }} min • {{ totalsWorkouts.kcal }} kcal</div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.text-gradient{background:linear-gradient(90deg,var(--bs-primary),#6c63ff);-webkit-background-clip:text;background-clip:text;color:transparent}
</style>
