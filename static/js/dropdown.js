export function renderDropdown(config) {
  const { trigger, items } = config;
  const dropdown = document.createElement("div");

  dropdown.className = "dropdown";
  dropdown.style.display = "none";

  const chevron = trigger.querySelector(".chevron-down");

  for (const item of items) {
    const option = document.createElement("button");
    option.className = "dropdown-item";
    option.textContent = item.name;

    option.addEventListener("click", () => {
      item.callback();
      dropdown.style.display = "none";
      trigger.textContent = item.name.toUpperCase() + " ";
      if (chevron) trigger.appendChild(chevron.cloneNode(true));
    });

    dropdown.appendChild(option);
  }

  trigger.insertAdjacentElement("afterend", dropdown);

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.style.display =
      dropdown.style.display === "none" ? "block" : "none";
  });

  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target) && !trigger.contains(e.target)) {
      dropdown.style.display = "none";
    }
  });
}
