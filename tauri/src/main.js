<script type="module">
  import { invoke } from '@tauri-apps/api/tauri';
  
  document.querySelector('button').addEventListener('click', () => {
    invoke('run_flask_app')
      .then(() => {
        console.log('Flask app is running...');
      })
      .catch((error) => {
        console.error('Error running Flask app:', error);
      });
  });
</script>