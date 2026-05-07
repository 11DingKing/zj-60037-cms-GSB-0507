<template>
  <router-view />
</template>

<script setup lang="ts">
</script>

<style>
html, body, #app {
  height: 100%;
  margin: 0;
  padding: 0;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB',
    'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
}

.el-menu {
  border-right: none;
}

.editor-container {
  min-height: 400px;
}

.tiptap {
  outline: none;
  min-height: 400px;
}

.tiptap > * + * {
  margin-top: 0.75em;
}

.tiptap ul,
.tiptap ol {
  padding: 0 1rem;
}

.tiptap h1,
.tiptap h2,
.tiptap h3,
.tiptap h4,
.tiptap h5,
.tiptap h6 {
  line-height: 1.1;
}

.tiptap code {
  background-color: rgba(#616161, 0.1);
  color: #616161;
  padding: 0.25em;
  border-radius: 0.25em;
}

.tiptap pre {
  background: #0d0d0d;
  color: #fff;
  font-family: 'JetBrainsMono', monospace;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
}

.tiptap pre code {
  color: inherit;
  padding: 0;
  background: none;
  font-size: 0.8rem;
}

.tiptap img {
  max-width: 100%;
  height: auto;
}

.tiptap blockquote {
  padding-left: 1rem;
  border-left: 3px solid rgba(#616161, 0.2);
}

.tiptap hr {
  border: none;
  border-top: 3px solid rgba(#616161, 0.1);
  margin: 2rem 0;
}

.tiptap a {
  color: #68cef8;
  text-decoration: underline;
}

.diff-added {
  background-color: #e6ffed;
  color: #22863a;
}

.diff-removed {
  background-color: #ffeef0;
  color: #b31d28;
}

.diff-unchanged {
  background-color: #fafbfc;
}
</style>
