const endpoint = "https://magic-8-ball.sfo3.cdn.digitaloceanspaces.com/";
const galleryContainer = document.querySelector('.gallery'); // Select the container where gallery items will be appended
let records = [];
let loaded = 0;
INITIAL_LOAD_COUNT = 20;
LAZY_LOAD_COUNT = 4;
LAZY_LOAD_TRIGGER_HEIGHT = 300;

async function fetchAllRecords(endpoint) {
  let limitParam = "limit=10";
  let nextMarker = null;
  let isTruncated = true;
  let allRecords = [];

  while (isTruncated) {
    const response = await fetch(`${endpoint}?${limitParam}${nextMarker ? `&marker=${encodeURIComponent(nextMarker)}` : ""}`);
    const xmlText = await response.text();

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");

    const records = Array.from(xmlDoc.querySelectorAll("Contents"));

    allRecords = allRecords.concat(records);

    isTruncated = xmlDoc.querySelector("IsTruncated").textContent === "true";

    if (isTruncated) {
      nextMarker = xmlDoc.querySelector("NextMarker").textContent;
    }
  }

  allRecords = allRecords.map(element => ({
    key: element.querySelector("Key").textContent,
    lastModified: new Date(element.querySelector("LastModified").textContent),
    url: element.querySelector("Key").textContent
  }));

  allRecords = allRecords.filter(record => {
    return !["index.html", "styles.css", "script.js"].includes(record.key);
  });

  return allRecords;
}

function appendToGallery(galleryContainer, items) {
  // galleryContainer.innerHTML = '';
  items.forEach(item => {
    const galleryItem = document.createElement('div');
    galleryItem.classList.add('gallery-item');
    galleryItem.innerHTML = `
          <img src="${endpoint}${item.url}" alt="${item.key}">
          <div class="gallery-item-title">${item.title}</div>
        `;
    galleryContainer.appendChild(galleryItem);
  });
}

function processTitles(items) {
  items.forEach(item => {
    const title = item.key.split('.')[0].replace(/_/g, ' ');
    item.title = title;
  });
}

function removeKeysWithSlash(items) {
  return items.filter(item => {
    return !item.key.includes('\\');
  });
}


document.addEventListener('DOMContentLoaded', async function () {
  records = await fetchAllRecords(endpoint)

  records.sort((a, b) => {
    return b.lastModified - a.lastModified;
  });

  records = removeKeysWithSlash(records);
  processTitles(records);
  
  const mostRecentRecords = records.slice(0, INITIAL_LOAD_COUNT);
  loaded = mostRecentRecords.length;
  console.log("Most recent records:", mostRecentRecords);

  appendToGallery(galleryContainer, mostRecentRecords);
});

const DEBOUNCE_DELAY = 100;
let isFetching = false;

function debounce(func, delay) {
  let inDebounce;
  return function () {
    const context = this;
    const args = arguments;
    clearTimeout(inDebounce);
    inDebounce = setTimeout(() => func.apply(context, args), delay);
  };
}

const lazyLoad = debounce(function () {
  if ((window.innerHeight + window.scrollY) >= (document.body.offsetHeight - LAZY_LOAD_TRIGGER_HEIGHT ) && !isFetching) {
    isFetching = true;
    console.log("At the bottom of the page");
    const newItems = records.slice(loaded, loaded + LAZY_LOAD_COUNT);
    console.log("New items:", newItems);
    appendToGallery(galleryContainer, newItems);
    loaded += LAZY_LOAD_COUNT;
    // Wait for the next tick to ensure DOM has updated
    setTimeout(function () {
      isFetching = false;
    }, 0);
  }
}, DEBOUNCE_DELAY);

document.addEventListener('scroll', lazyLoad);