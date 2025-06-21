var dropdown = document.getElementsByClassName("dropdown-toggle");
var sidebar = document.getElementsByClassName("sidemenu-btn");
var i;

for (i = 0; i < dropdown.length; i++) {
    dropdown[i].addEventListener("click", function () {
        this.classList.toggle("active");
        var dropdownContent = this.nextElementSibling;
        if (dropdownContent.style.display === "flex") {
            dropdownContent.style.display = "none";
        } else {
            dropdownContent.style.display = "flex";
        }
    });
}

for (i = 0; i < sidebar.length; i++) {
    sidebar[i].addEventListener("click", function () {
        this.classList.toggle("active");
        var sidebarContent = this.nextElementSibling;
        if (sidebarContent.style.display === "block") {
            sidebarContent.style.display = "none";
        } else {
            sidebarContent.style.display = "block";
        }
    });
}

const optionsMap = {
    jfk: ['Sector A', 'Sector B'],
    lga: ['Sector C', 'Sector D'],
    ewr: ['Sector E', 'Sector F'],
    sid: ['SID Alpha', 'SID Bravo'],
    star: ['STAR X', 'STAR Y']
};

document.querySelectorAll('.toggle-btn').forEach(button => {
    button.addEventListener('click', () => {
        const targetId = button.dataset.target;
        const submenu = document.getElementById(targetId);
        submenu.classList.toggle('hidden');
    });
});

const popupMenu = document.getElementById('popup-sidemenu');

document.querySelectorAll('.sidemenu-toggle').forEach(item => {
  item.addEventListener('click', e => {
    e.stopPropagation();
    const value = item.dataset.value;

    // Check if the value exists in the map
    if (!optionsMap[value]) {
      console.warn(`No options found for "${value}"`);
      popupMenu.style.display = 'none';
      return;
    }

    popupMenu.innerHTML = optionsMap[value]
      .map(opt => `<label><input type="checkbox" /> ${opt}</label>`)
      .join('');
    const rect = item.getBoundingClientRect();
    popupMenu.style.top = `${rect.top}px`;
    popupMenu.style.left = `${rect.right + 10}px`;
    popupMenu.style.display = 'flex';
  });
});


document.addEventListener('click', e => {
    if (!popupMenu.contains(e.target) && !e.target.classList.contains('sidemenu-toggle')) {
        popupMenu.style.display = 'none';
    }
});