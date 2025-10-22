<script setup>
import { ref, computed, onMounted, watch } from "vue";

const selectedDate = ref(toISO(new Date()));
const targets = ref({ weightKg: 65, calorieTarget: 2000 });

const mealForm = ref({ type: "Breakfast", name: "", kcal: "", protein: null, carbs: null, fat: null });
const meals = ref([]);

const workoutForm = ref({ activity: "", minutes: "", met: 3.5 });
const workouts = ref([]);

function toISO(d){const m=String(d.getMonth()+1).padStart(2,"0");const day=String(d.getDate()).padStart(2,"0");return`${d.getFullYear()}-${m}-${day}`;}
const rid=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);
const kcalPerMin=(MET,kg)=>(Number(MET)*3.5*Number(kg))/200;
const digitsOnly=(s)=>(s??"").replace(/\D+/g,"");

const mealsToday = computed(()=>meals.value.filter(m=>m.date===selectedDate.value));
const workoutsToday = computed(()=>workouts.value.filter(w=>w.date===selectedDate.value));

const mealFormValid = computed(()=>mealForm.value.name.trim() && Number(mealForm.value.kcal)>0);
const workoutFormValid = computed(()=>workoutForm.value.activity.trim() && Number(workoutForm.value.minutes)>0 && Number(workoutForm.value.met)>0 && Number(targets.value.weightKg)>0);

function addMeal(){
  if(!mealFormValid.value) return;
  meals.value.push({
    id:rid(), date:selectedDate.value,
    type:mealForm.value.type,
    name:mealForm.value.name.trim(),
    kcal:Number(mealForm.value.kcal)||0,
    protein:Number(mealForm.value.protein)||0,
    carbs:Number(mealForm.value.carbs)||0,
    fat:Number(mealForm.value.fat)||0,
  });
  mealForm.value={ type:"Breakfast", name:"", kcal:"", protein:null, carbs:null, fat:null };
}
function removeMeal(id){ meals.value = meals.value.filter(m=>m.id!==id); }

function addWorkout(){
  if(!workoutFormValid.value) return;
  const mins=Number(workoutForm.value.minutes), met=Number(workoutForm.value.met), kg=Number(targets.value.weightKg);
  const kcal=Math.round(kcalPerMin(met,kg)*mins);
  workouts.value.push({ id:rid(), date:selectedDate.value, activity:workoutForm.value.activity.trim(), minutes:mins, met, kcal });
  workoutForm.value={ activity:"", minutes:"", met:3.5 };
}
function removeWorkout(id){ workouts.value = workouts.value.filter(w=>w.id!==id); }

const totalsMeals = computed(()=>({
  kcal: mealsToday.value.reduce((a,m)=>a+m.kcal,0),
  protein: mealsToday.value.reduce((a,m)=>a+m.protein,0),
  carbs: mealsToday.value.reduce((a,m)=>a+m.carbs,0),
  fat: mealsToday.value.reduce((a,m)=>a+m.fat,0),
}));
const totalsWorkouts = computed(()=>({
  minutes: workoutsToday.value.reduce((a,w)=>a+w.minutes,0),
  kcal: workoutsToday.value.reduce((a,w)=>a+w.kcal,0),
}));

const netCalories = computed(()=>totalsMeals.value.kcal - totalsWorkouts.value.kcal);
const overBy = computed(()=>Math.max(0, netCalories.value - Number(targets.value.calorieTarget||0)));

function minutesToBurn(cal, met){
  const perMin=kcalPerMin(Number(met), Number(targets.value.weightKg||0));
  return perMin>0?Math.ceil(cal/perMin):0;
}
const suggestions = computed(()=>{
  if(overBy.value<=0) return [];
  const acts=[{name:"Walk (5 km/h)",met:3.5},{name:"Cycle easy",met:6.0},{name:"Jog (8 km/h)",met:8.3}];
  return acts.map(a=>({...a, minutes: minutesToBurn(overBy.value,a.met)}));
});

onMounted(()=>{
  const raw=localStorage.getItem("nm_state_v1");
  if(!raw) return;
  try{
    const {meals:M=[],workouts:W=[],targets:T=null}=JSON.parse(raw);
    meals.value=Array.isArray(M)?M:[];
    workouts.value=Array.isArray(W)?W:[];
    if(T&&typeof T==="object") targets.value={...targets.value,...T};
  }catch{}
});
watch([meals,workouts,targets],()=>localStorage.setItem("nm_state_v1",JSON.stringify({meals:meals.value,workouts:workouts.value,targets:targets.value})),{deep:true});
</script>

<template>
  <section class="container py-4">
    <h1 class="h5 fw-bold mb-3">Fuel & Move</h1>

    <div class="row g-3 align-items-end mb-4">
      <div class="col-auto">
        <label class="form-label small text-uppercase">Date</label>
        <input type="date" class="form-control" v-model="selectedDate" />
      </div>
      <div class="col">
        <div class="card shadow-sm">
          <div class="card-body d-flex gap-3 flex-wrap align-items-center">
            <span class="badge rounded-pill bg-light text-dark">Meals: {{ totalsMeals.kcal }} kcal</span>
            <span class="badge rounded-pill bg-light text-dark">Protein: {{ totalsMeals.protein }} g</span>
            <span class="badge rounded-pill bg-light text-dark">Carbs: {{ totalsMeals.carbs }} g</span>
            <span class="badge rounded-pill bg-light text-dark">Fat: {{ totalsMeals.fat }} g</span>
            <span class="vr"></span>
            <span class="badge rounded-pill bg-light text-dark">Workout: {{ totalsWorkouts.kcal }} kcal / {{ totalsWorkouts.minutes }} min</span>
            <span class="vr"></span>
            <span class="badge rounded-pill bg-light text-dark">Net: {{ netCalories }} kcal</span>
          </div>
        </div>
      </div>
    </div>

    <div class="card shadow-sm mb-4">
      <div class="card-body">
        <h2 class="h6 mb-3">Daily Targets</h2>
        <div class="row g-2">
          <div class="col-6 col-md-3">
            <label class="form-label">Weight (kg)</label>
            <input type="number" min="1" class="form-control" v-model.number="targets.weightKg" />
          </div>
          <div class="col-6 col-md-3">
            <label class="form-label">Calorie Target</label>
            <input type="number" min="0" class="form-control" v-model.number="targets.calorieTarget" />
          </div>
          <div class="col-12 col-md-6 d-flex align-items-end">
            <div class="ms-md-3 small">
              Net: <strong>{{ netCalories }}</strong> kcal
              <span v-if="overBy > 0"> • Over by <strong>{{ overBy }}</strong> kcal</span>
              <span v-else class="text-success"> • On/under target 🎉</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card shadow-sm mb-4">
      <div class="card-body">
        <h2 class="h6 mb-3">Add Meal</h2>
        <div class="row g-2">
          <div class="col-12 col-md-3">
            <select class="form-select" v-model="mealForm.type">
              <option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Snack</option>
            </select>
          </div>
          <div class="col-12 col-md-3">
            <input class="form-control" placeholder="Meal name" v-model.trim="mealForm.name" />
          </div>
          <div class="col-6 col-md-2">
            <input
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              class="form-control"
              placeholder="kcal"
              :value="mealForm.kcal ?? ''"
              @input="e => mealForm.kcal = digitsOnly(e.target.value)"
            />
          </div>
          <div class="col-6 col-md-1"><input type="number" min="0" class="form-control" placeholder="P" v-model.number="mealForm.protein" /></div>
          <div class="col-6 col-md-1"><input type="number" min="0" class="form-control" placeholder="C" v-model.number="mealForm.carbs" /></div>
          <div class="col-6 col-md-1"><input type="number" min="0" class="form-control" placeholder="F" v-model.number="mealForm.fat" /></div>
          <div class="col-12 col-md-1 d-grid"><button class="btn btn-dark" :disabled="!mealFormValid" @click="addMeal">Add</button></div>
        </div>
        <p class="small text-danger mt-2" v-if="!mealFormValid && (mealForm.name || mealForm.kcal)">Enter a meal name and a kcal value &gt; 0.</p>
      </div>
    </div>

    <div class="card shadow-sm mb-4">
      <div class="card-body">
        <h2 class="h6 mb-3">Meals</h2>
        <div v-if="mealsToday.length===0" class="text-muted">No meals yet.</div>
        <ul class="list-group">
          <li v-for="m in mealsToday" :key="m.id" class="list-group-item d-flex justify-content-between align-items-center">
            <div>
              <div class="fw-semibold">{{ m.type }} — {{ m.name }}</div>
              <div class="small text-secondary">{{ m.kcal }} kcal • P{{ m.protein }} C{{ m.carbs }} F{{ m.fat }}</div>
            </div>
            <button class="btn btn-sm btn-outline-danger" @click="removeMeal(m.id)">Delete</button>
          </li>
        </ul>
      </div>
    </div>

    <div class="card shadow-sm mb-4">
      <div class="card-body">
        <h2 class="h6 mb-3">Add Workout</h2>
        <div class="row g-2">
          <div class="col-12 col-md-4"><input class="form-control" placeholder="Activity" v-model.trim="workoutForm.activity" /></div>
          <div class="col-6 col-md-3">
            <input
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              class="form-control"
              placeholder="Minutes"
              :value="workoutForm.minutes ?? ''"
              @input="e => workoutForm.minutes = digitsOnly(e.target.value)"
            />
          </div>
          <div class="col-6 col-md-3">
            <select class="form-select" v-model.number="workoutForm.met">
              <option :value="3.5">Walk (5 km/h) – 3.5 MET</option>
              <option :value="6.0">Cycle easy – 6.0 MET</option>
              <option :value="8.3">Jog (8 km/h) – 8.3 MET</option>
            </select>
          </div>
          <div class="col-12 col-md-2 d-grid"><button class="btn btn-success" :disabled="!workoutFormValid" @click="addWorkout">Add</button></div>
        </div>
        <p class="small text-danger mt-2" v-if="!workoutFormValid && (workoutForm.activity || workoutForm.minutes)">Enter activity, minutes &gt; 0, and set your weight in Targets.</p>
      </div>
    </div>

    <div class="card shadow-sm mb-4">
      <div class="card-body">
        <h2 class="h6 mb-3">Workouts</h2>
        <div v-if="workoutsToday.length===0" class="text-muted">No workouts yet.</div>
        <ul class="list-group">
          <li v-for="w in workoutsToday" :key="w.id" class="list-group-item d-flex justify-content-between align-items-center">
            <div>
              <div class="fw-semibold">{{ w.activity }}</div>
              <div class="small text-secondary">{{ w.minutes }} min • MET {{ w.met }} • {{ w.kcal }} kcal</div>
            </div>
            <button class="btn btn-sm btn-outline-danger" @click="removeWorkout(w.id)">Delete</button>
          </li>
        </ul>
        <div class="mt-3 small"><strong>Workout totals:</strong> {{ totalsWorkouts.minutes }} min • {{ totalsWorkouts.kcal }} kcal</div>
      </div>
    </div>

    <div class="card shadow-sm">
      <div class="card-body">
        <h2 class="h6 mb-3">Suggestions</h2>
        <div v-if="overBy<=0" class="text-success">You're at/under target — nice!</div>
        <div v-else class="d-flex flex-wrap gap-2">
          <span class="badge bg-light text-dark">Over by {{ overBy }} kcal</span>
          <button v-for="s in suggestions" :key="s.name" class="btn btn-outline-secondary btn-sm">
            {{ s.name }} • {{ s.minutes }} min
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.vr{width:1px;height:28px;background:var(--bs-border-color)}
.shadow-sm{box-shadow:0 8px 24px rgba(0,0,0,.06)!important}
</style>
