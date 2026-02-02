<template>
  <section class="card">
    <h3>Enlaces afiliado</h3>
    <div class="grid grid-2">
      <div>
        <label>Nombre</label>
        <input v-model="form.name" />
      </div>
      <div>
        <label>ASIN</label>
        <input v-model="form.asin" />
      </div>
      <div>
        <label>URL</label>
        <input v-model="form.url" />
      </div>
      <div style="align-self: end;">
        <button @click="create">Crear</button>
      </div>
    </div>
  </section>

  <section class="card">
    <h3>Listado</h3>
    <ul>
      <li v-for="link in links" :key="link.id">{{ link.name }} - {{ link.url }}</li>
    </ul>
  </section>
</template>

<script setup>
import { onMounted, ref } from "vue";
import api from "../api.js";

const links = ref([]);
const form = ref({ name: "", asin: "", url: "" });

async function load() {
  const { data } = await api.get("/affiliate-links");
  links.value = data;
}

async function create() {
  if (!form.value.name || !form.value.asin || !form.value.url) return;
  await api.post("/affiliate-links", form.value);
  form.value = { name: "", asin: "", url: "" };
  await load();
}

onMounted(load);
</script>
