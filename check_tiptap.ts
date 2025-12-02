import StarterKit from '@tiptap/starter-kit';
console.log(
  JSON.stringify(
    StarterKit.extensions.map(e => e.name),
    null,
    2
  )
);
