document.addEventListener('DOMContentLoaded', () => {
  const tattooForm = document.getElementById('tattooForm');
  const imageUpload = document.getElementById('imageUpload');
  const imagePreview = document.getElementById('imagePreview');
  const tattooList = document.getElementById('tattooList');

  // Load existing tattoo data
  fetchTattoos();

  // Image preview functionality
  imageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.match('image.*')) {
      alert('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
    };
    reader.readAsDataURL(file);
  });

  // Form submission
  tattooForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(tattooForm);
    const submitBtn = tattooForm.querySelector('button[type="submit"]');
    
    // Basic validation
    const price = formData.get('price');
    const time = formData.get('timeInMinutes');
    const image = formData.get('image');
    
    if (!price || !time || !image.name) {
      alert('Please fill all required fields and select an image');
      return;
    }
    
    // Disable button and show loading state
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading-spinner"></span> Saving...';
    
    try {
      const response = await fetch('/api/tattoos', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Something went wrong');
      }
      
      // Reset form
      tattooForm.reset();
      imagePreview.innerHTML = '';
      
      // Refresh the tattoo list
      fetchTattoos();
      
      alert('Tattoo data saved successfully!');
    } catch (error) {
      console.error('Error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      // Restore button state
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  });
  
  // Fetch and display tattoo entries
  async function fetchTattoos() {
    try {
      const response = await fetch('/api/tattoos');
      const tattoos = await response.json();
      
      if (!response.ok) {
        throw new Error('Failed to fetch tattoo data');
      }
      
      displayTattoos(tattoos);
    } catch (error) {
      console.error('Error fetching tattoos:', error);
      tattooList.innerHTML = '<p>Error loading tattoo data. Please try again later.</p>';
    }
  }
  
  function displayTattoos(tattoos) {
    if (!tattoos.length) {
      tattooList.innerHTML = '<p>No tattoo data available yet. Add your first tattoo above!</p>';
      return;
    }
    
    tattooList.innerHTML = '';
    
    tattoos.forEach(tattoo => {
      const tattooElement = document.createElement('div');
      tattooElement.className = 'tattoo-item';
      
      const tagsHTML = tattoo.tags.map(tag => `<span class="tag">${tag}</span>`).join('');
      
      tattooElement.innerHTML = `
        <img src="${tattoo.imageUrl}" alt="Tattoo" class="tattoo-image">
        <div class="tattoo-details">
          <div class="tattoo-price">$${tattoo.price.toFixed(2)}</div>
          <div class="tattoo-time">${formatTime(tattoo.timeInMinutes)}</div>
          <div class="tattoo-tags">${tagsHTML || '<span class="tag">No tags</span>'}</div>
        </div>
      `;
      
      tattooList.appendChild(tattooElement);
    });
  }
  
  function formatTime(minutes) {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours} hr`;
    }
    
    return `${hours} hr ${remainingMinutes} min`;
  }
});