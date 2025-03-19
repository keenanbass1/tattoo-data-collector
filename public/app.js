document.addEventListener('DOMContentLoaded', () => {
  const tattooForm = document.getElementById('tattooForm');
  const imageUpload = document.getElementById('imageUpload');
  const imagePreview = document.getElementById('imagePreview');
  const tattooList = document.getElementById('tattooList');

  // iOS detection for app behavior
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  // Load existing tattoo data
  fetchTattoos();

  // Image preview functionality with added iOS support
  imageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.match('image.*')) {
      alert('Please select an image file');
      return;
    }

    // Add file size check for iOS devices (which tend to have large photos)
    if (file.size > 5 * 1024 * 1024 && isIOS) {
      alert('Image is too large. Please select a smaller image or take a new photo with lower resolution.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
    };
    reader.readAsDataURL(file);
  });

  // Prevent iOS zoom on form fields
  document.querySelectorAll('input[type="text"], input[type="number"]').forEach(input => {
    input.style.fontSize = '16px';
  });

  // Form submission with improved touch handling
  tattooForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(tattooForm);
    const submitBtn = tattooForm.querySelector('button[type="submit"]');
    
    // Basic validation
    const price = formData.get('price');
    const time = formData.get('timeInHours');
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
      // Add a small delay on iOS to prevent animation jank
      if (isIOS) await new Promise(r => setTimeout(r, 100));
      
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
  
  // Add pull-to-refresh capability for mobile
  let touchstartY = 0;
  document.addEventListener('touchstart', e => {
    touchstartY = e.touches[0].clientY;
  }, { passive: true });
  
  document.addEventListener('touchend', e => {
    const touchendY = e.changedTouches[0].clientY;
    const diff = touchendY - touchstartY;
    
    // If pulled down by at least 100px while at the top of the page
    if (diff > 100 && window.scrollY === 0) {
      fetchTattoos();
    }
  }, { passive: true });
  
  // Fetch and display tattoo entries
  async function fetchTattoos() {
    try {
      // Show loading indicator
      tattooList.innerHTML = '<div class="loading">Loading data...</div>';
      
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
      
      // Add loading attribute to images for better performance
      tattooElement.innerHTML = `
        <img src="${tattoo.imageUrl}" alt="Tattoo" class="tattoo-image" loading="lazy">
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