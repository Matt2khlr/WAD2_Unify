import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import vuetify from './plugins/vuetify';

import "bootstrap/dist/css/bootstrap.min.css";
import bootstrap from "bootstrap/dist/js/bootstrap.bundle.min.js";

// Make bootstrap globally available for components
window.bootstrap = bootstrap;

createApp(App).use(router).use(vuetify).mount("#app");