import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, test } from 'node:test';
import { JSDOM } from 'jsdom';

// Vue debe importar el DOM después de instalar el entorno del navegador.
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
});
for (const name of ['window', 'document', 'navigator', 'Node', 'Element', 'HTMLElement', 'SVGElement', 'DOMParser', 'MutationObserver']) {
  Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
}
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);

const { mount, flushPromises } = await import('@vue/test-utils');
const { nextTick } = await import('vue');
const { parse, compileScript } = await import('vue/compiler-sfc');
const source = readFileSync(new URL('../src/components/RichTextEditor.vue', import.meta.url), 'utf8');
const { descriptor } = parse(source);
const compiled = compileScript(descriptor, { id: 'rich-text-editor-test', inlineTemplate: true });
// Resolver las dependencias antes de importar el SFC compilado desde una URL de datos.
const moduleSource = compiled.content.replace(/from (['"])([^'"]+)\1/g, (_match, _quote, specifier) => {
  return `from ${JSON.stringify(import.meta.resolve(specifier))}`;
});
const { default: RichTextEditor } = await import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`);
const wrappers = [];
const articleHtml = `<article><section class="verdict-box"><h2>Veredicto rápido</h2><ul class="takeaways"><li>Dato contrastado</li></ul></section>
<figure><img src="https://example.com/product.jpg" alt="Producto" loading="lazy" /></figure>
<section><h2>Comparativa</h2><table><caption>Datos técnicos</caption><tbody><tr><th scope="row">Depósito</th><td>3 L</td></tr></tbody></table>
<p><a href="/analisis/alternativa">Alternativa</a> y <a href="https://www.amazon.es/dp/B0CMTKCZZ2" rel="nofollow sponsored noopener">Amazon</a></p></section></article>`;

async function createEditor(html = '') {
  const wrapper = mount(RichTextEditor, {
    attachTo: document.body,
    props: {
      modelValue: html,
      'onUpdate:modelValue': value => wrapper.setProps({ modelValue: value }),
    },
  });
  wrappers.push(wrapper);
  await flushPromises();
  await nextTick();
  return wrapper;
}

afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount());
  document.body.innerHTML = '';
});

test('editar HTML conserva exactamente imágenes, clases, tablas y enlaces en v-model', async () => {
  const wrapper = await createEditor(articleHtml);
  const edited = articleHtml.replace('3 L', '5 L');
  await wrapper.get('textarea').setValue(edited);
  await flushPromises();
  assert.equal(wrapper.props('modelValue'), edited);
  assert.equal(wrapper.get('textarea').element.value, edited);
  assert.deepEqual(wrapper.emitted('update:modelValue'), [[edited]]);
});

test('la sincronización externa no emite HTML normalizado ni modifica el formulario', async () => {
  const wrapper = await createEditor('<p>Inicial</p>');
  await wrapper.setProps({ modelValue: articleHtml });
  await flushPromises();
  assert.equal(wrapper.emitted('update:modelValue'), undefined);
  assert.equal(wrapper.get('textarea').element.value, articleHtml);
});

test('no permite pasar a visual si se perderían partes del artículo', async () => {
  const wrapper = await createEditor(articleHtml);
  const button = wrapper.get('.editor-toolbar button');
  assert.equal(button.attributes('disabled'), '');
  assert.match(wrapper.get('[role="status"]').text(), /conservar/i);
  await button.trigger('click');
  assert.equal(wrapper.get('textarea').element.value, articleHtml);
  assert.equal(wrapper.emitted('update:modelValue'), undefined);
});

test('detectar contenido no representable no depende de etiquetas envolventes', async () => {
  for (const html of [
    '<p><img src="https://example.com/photo.jpg" alt="Foto" /></p>',
    '<p class="verdict-box">Texto con clase</p>',
    '<table><caption>Título</caption><tbody><tr><td>Dato</td></tr></tbody></table>',
    '<p><a href="/analisis/alternativa">Enlace interno</a></p>',
    '<!doctype html><html lang="es"><head><title>Ficha</title></head><body><p>Texto</p></body></html>',
  ]) {
    const wrapper = await createEditor(html);
    assert.equal(wrapper.get('textarea').element.value, html);
    assert.equal(wrapper.get('.editor-toolbar button').attributes('disabled'), '');
    assert.equal(wrapper.emitted('update:modelValue'), undefined);
  }
});

test('el HTML sencillo puede alternar entre visual y fuente sin emitir cambios', async () => {
  const wrapper = await createEditor('<p>Texto <strong>seguro</strong></p>');
  assert.ok(wrapper.find('.tiptap').exists());
  await wrapper.get('.editor-toolbar button').trigger('click');
  assert.equal(wrapper.get('textarea').element.value, '<p>Texto <strong>seguro</strong></p>');
  await wrapper.get('.editor-toolbar button').trigger('click');
  assert.ok(wrapper.find('.tiptap').exists());
  assert.equal(wrapper.emitted('update:modelValue'), undefined);
});

test('pegar HTML complejo desde un editor nuevo bloquea solo el modo visual', async () => {
  const wrapper = await createEditor();
  await wrapper.get('.editor-toolbar button').trigger('click');
  await wrapper.get('textarea').setValue(articleHtml);
  await flushPromises();
  assert.equal(wrapper.props('modelValue'), articleHtml);
  assert.equal(wrapper.get('.editor-toolbar button').attributes('disabled'), '');
  await wrapper.get('textarea').setValue('<p>Contenido sencillo</p>');
  await flushPromises();
  assert.equal(wrapper.get('.editor-toolbar button').attributes('disabled'), undefined);
  await wrapper.get('.editor-toolbar button').trigger('click');
  assert.equal(wrapper.get('.tiptap').text(), 'Contenido sencillo');
});

test('varias ediciones sucesivas no crean bucles ni emisiones duplicadas', async () => {
  const wrapper = await createEditor(articleHtml);
  const first = articleHtml.replace('3 L', '4 L');
  const second = articleHtml.replace('3 L', '6 L');
  await wrapper.get('textarea').setValue(first);
  await flushPromises();
  await wrapper.get('textarea').setValue(second);
  await flushPromises();
  assert.deepEqual(wrapper.emitted('update:modelValue'), [[first], [second]]);
  assert.equal(wrapper.props('modelValue'), second);
});

test('las ediciones visuales siguen actualizando el formulario', async () => {
  const wrapper = await createEditor('<p>Texto</p>');
  const editor = wrapper.get('.tiptap').element.editor;
  editor.commands.setTextSelection({ from: 1, to: 6 });
  editor.commands.toggleBold();
  await flushPromises();
  assert.equal(wrapper.props('modelValue'), '<p><strong>Texto</strong></p>');
  assert.deepEqual(wrapper.emitted('update:modelValue'), [['<p><strong>Texto</strong></p>']]);
  assert.ok(wrapper.find('.tiptap').exists());
});
