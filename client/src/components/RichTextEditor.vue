<template>
  <div v-if="editor" class="editor-container">
    <div class="editor-toolbar">
      <button 
        type="button"
        @click="editor.chain().focus().toggleBold().run()" 
        :class="{ 'is-active': editor.isActive('bold') }"
        title="Negrita"
      >
        <BoldIcon :size="18" />
      </button>
      <button 
        type="button"
        @click="editor.chain().focus().toggleItalic().run()" 
        :class="{ 'is-active': editor.isActive('italic') }"
        title="Cursiva"
      >
        <ItalicIcon :size="18" />
      </button>
      <div class="toolbar-divider"></div>
      <button 
        type="button"
        @click="editor.chain().focus().toggleHeading({ level: 2 }).run()" 
        :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }"
        title="Título 2"
      >
        <Heading2Icon :size="18" />
      </button>
      <button 
        type="button"
        @click="editor.chain().focus().toggleHeading({ level: 3 }).run()" 
        :class="{ 'is-active': editor.isActive('heading', { level: 3 }) }"
        title="Título 3"
      >
        <Heading3Icon :size="18" />
      </button>
      <div class="toolbar-divider"></div>
      <button 
        type="button"
        @click="editor.chain().focus().toggleBulletList().run()" 
        :class="{ 'is-active': editor.isActive('bulletList') }"
        title="Lista de puntos"
      >
        <ListIcon :size="18" />
      </button>
      <button 
        type="button"
        @click="editor.chain().focus().toggleOrderedList().run()" 
        :class="{ 'is-active': editor.isActive('orderedList') }"
        title="Lista numerada"
      >
        <ListOrderedIcon :size="18" />
      </button>
      <div class="toolbar-divider"></div>
      <button 
        type="button"
        @click="editor.chain().focus().toggleBlockquote().run()" 
        :class="{ 'is-active': editor.isActive('blockquote') }"
        title="Cita"
      >
        <QuoteIcon :size="18" />
      </button>
      <button 
        type="button"
        @click="editor.chain().focus().toggleCodeBlock().run()" 
        :class="{ 'is-active': editor.isActive('codeBlock') }"
        title="Bloque de código"
      >
        <CodeIcon :size="18" />
      </button>
      <div class="toolbar-divider"></div>
      <button 
        type="button"
        @click="editor.chain().focus().undo().run()" 
        :disabled="!editor.can().undo()"
        title="Deshacer"
      >
        <UndoIcon :size="18" />
      </button>
      <button 
        type="button"
        @click="editor.chain().focus().redo().run()" 
        :disabled="!editor.can().redo()"
        title="Rehacer"
      >
        <RedoIcon :size="18" />
      </button>
    </div>
    <editor-content :editor="editor" class="editor-content-area" />
  </div>
</template>

<script setup>
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { watch } from 'vue'
import {
  BoldIcon,
  ItalicIcon,
  Heading2Icon,
  Heading3Icon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
  CodeIcon,
  UndoIcon,
  RedoIcon
} from 'lucide-vue-next'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue'])

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit,
  ],
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML())
  },
})

watch(() => props.modelValue, (value) => {
  const isSame = editor.value.getHTML() === value
  if (isSame) return
  editor.value.commands.setContent(value, false)
})
</script>

<style>
.editor-container {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: #fff;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.editor-toolbar {
  padding: 8px;
  background: #ffffff;
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  background: linear-gradient(to bottom, #ffffff, #f8fafc);
}

.editor-toolbar button {
  width: 32px;
  height: 32px;
  padding: 0 !important; /* Force reset */
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  background: transparent;
  color: #475569;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}

.editor-toolbar button:hover {
  background: #f1f5f9;
  color: var(--primary);
  border-color: #e2e8f0;
}

.editor-toolbar button.is-active {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
}

.editor-toolbar button:disabled {
  opacity: 0.2;
  cursor: not-allowed;
}

.editor-container:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: var(--border);
  margin: 6px 4px;
}

.editor-content-area {
  padding: 16px;
  min-height: 200px;
  max-height: 500px;
  overflow-y: auto;
}

/* TipTap Basic Styles */
.ProseMirror {
  outline: none;
  min-height: 180px;
}

.ProseMirror p { margin-bottom: 1em; }
.ProseMirror h2 { font-size: 1.5rem; margin: 1.5em 0 0.5em; }
.ProseMirror h3 { font-size: 1.25rem; margin: 1.25em 0 0.5em; }
.ProseMirror ul, .ProseMirror ol { padding-left: 1.5em; margin-bottom: 1em; }
.ProseMirror blockquote {
  border-left: 4px solid var(--primary);
  padding-left: 1em;
  color: var(--text-muted);
  font-style: italic;
  margin: 1em 0;
}
.ProseMirror code {
  background: #f1f5f9;
  padding: 2px 4px;
  border-radius: 4px;
  font-family: monospace;
}
.ProseMirror pre {
  background: #0f172a;
  color: #f8fafc;
  padding: 1em;
  border-radius: 8px;
  font-family: monospace;
  margin: 1em 0;
}
</style>
