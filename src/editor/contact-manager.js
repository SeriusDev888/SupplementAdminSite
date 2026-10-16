// Contact content shares the editor's draft, undo, save and publish lifecycle.
(() => {
  const field = document.getElementById('contact-details');
  field.addEventListener('input', () => {
    EditorAPI.mutate(() => {
      EditorAPI.document().contact = {
        ...EditorAPI.document().contact,
        details: field.innerText.slice(0, 20000),
      };
    });
  });
  function syncContact() {
    if (document.activeElement !== field)
      field.textContent = EditorAPI.document()?.contact?.details || '';
  }
  addEventListener('editor:document', syncContact);
  syncContact();
})();
