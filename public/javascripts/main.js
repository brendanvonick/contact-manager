let searchValue = '';
let searchTags = [];

function createPostData(form, contact) {
  let data = {};
  let contactTags;
  for (let idx = 0; idx < form.elements.length; idx += 1) {
    let element = form.elements[idx];
    if (element.type === 'text') {
      data[element.name] = element.value;
    } else if (element.type === 'select-one' && element.name === 'tag' && element.value.length > 0) {
      if (contact && contact.tags) {
        contactTags = contact.tags.map(tagObj => {
          return tagObj.tag;
        });
        contactTags.push(element.value);
      }
      data.tags = contactTags ? contactTags.join(',') : element.value;
    }
  }
  return data;
}

class ContactsList {
  constructor(mainContainer) {
    this.contacts = [];
    this.tags = [];
    this.mainContainer = mainContainer

    this.loadContacts();
  }

  getExistingTags() {
    this.tags = [];
    let contactTags = this.tags;
    this.contacts.forEach(contact => {
      if (contact.tags) {
        let tags = contact.tags.map(tagObj => {
          return tagObj.tag;
        });
        for (let idx = 0; idx < tags.length; idx++) {
          if (contactTags.indexOf(tags[idx]) === -1 ) {
            contactTags.push(tags[idx]);
          }
        }
      }
    });
    this.renderTags();
  }

  renderTags() {
    let tagsArr = this.tags.map(tagValue => {
      return { tag: tagValue }
    });
    let tagsListTemplate = Handlebars.compile(document.getElementById('tags-list-template').innerHTML);
    document.querySelector('div.tags-list').innerHTML = tagsListTemplate({ tagsList: tagsArr })
  }

  addTagToList(event) {
    event.preventDefault();
    let form = document.querySelector('form');
    let elements = Array.prototype.slice.call(form.elements);
    let tag = elements.filter(element => element.type === 'text')[0].value;

    if (this.tags.indexOf(tag) === -1 && tag.length > 0) {
      this.tags.push(tag);
    }

    this.renderTags();
    form.reset();
  }

  getContactId(full_name) {
    let contact = this.contacts.filter(contact => contact.full_name === full_name)[0];
    return contact.id;
  }

  getContact(full_name) {
    return this.contacts.filter(contact => contact.full_name === full_name)[0];
  }

  loadContacts() {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', 'http://localhost:3000/api/contacts');
    xhr.responseType = 'json';

    xhr.addEventListener('load', event => {
      this.contacts = xhr.response;
      if (this.contacts.length === 0) {
        this.renderNoContacts();
        this.getExistingTags();
        return;
      }

      this.contacts.forEach(contact => {
        if (contact.tags && contact.tags.includes(',')) {
          contact.tags = contact.tags.split(',').map(tagValue => {
            return { tag: tagValue };
          });
        } else if (contact.tags) {
          contact.tags = [{ tag: contact.tags }];
        }
      });

      let contactsTemplate = Handlebars.compile(document.querySelector('#contacts-template').innerHTML);
      let contactsUL = contactsTemplate({ contacts: this.contacts });
      this.mainContainer.innerHTML = contactsUL;
      this.getExistingTags();
    });

    xhr.send();
  }

  deleteContact(target) {
    let parentDiv = target.parentNode;
    let full_name = parentDiv.querySelector('.full-name').textContent.trim();
    let id = this.getContactId(full_name);
    if (confirm('Do you want to delete the contact ?')) {
      parentDiv.remove();
      let xhr = new XMLHttpRequest();
      xhr.open('DELETE', `http://localhost:3000/api/contacts/${id}`);
      xhr.addEventListener('load', () => {
        if (xhr.status !== 204) {
          alert('Contact could not be deleted');
        } else {
          this.loadContacts();
        }
      });

      xhr.send();
    }
  }

  renderNoContacts() {
    let div = document.createElement('div');
    div.classList.add('no-contacts');
    let h1 = document.createElement('H1');
    h1.textContent = 'There are no contacts';
    let addContactButton = document.querySelector('.add-contact');
    let newContactButton = addContactButton.cloneNode(true);
    div.appendChild(h1);
    div.appendChild(newContactButton);
    document.querySelector('.main-container').appendChild(div);
  }

  // implement awaitFormButtons (form validation and submit/cancel)
  renderCreateContactForm(target) {
    event.preventDefault();
    let createContactTemplate = Handlebars.compile(document.getElementById('create-contact-script').innerHTML);
    let tagsArr = this.tags.map(tagValue => {
      return { tag: tagValue }
    });
    this.mainContainer.innerHTML = createContactTemplate({ tagsList: tagsArr });
    this.awaitFormButtons('POST');
  }

  renderEditContactForm(target) {
    event.preventDefault();
    let editContactTemplate = Handlebars.compile(document.getElementById('edit-contact-script').innerHTML);
    let targetFullName = target.parentNode.querySelector('.full-name').textContent.trim();
    let contact = this.getContact(targetFullName);
    let tagsArr = this.tags.map(tagValue => {
      return { tag: tagValue }
    });
    contact.tagsList = tagsArr;
    this.mainContainer.innerHTML = editContactTemplate(contact);
    this.awaitFormButtons('PUT', contact);
  }

  awaitFormButtons(method, contact) {
    let form = document.getElementById('edit-contact-form') ||
               document.getElementById('create-contact-form');
    form.querySelector('#cancel-contact').addEventListener('click', event => {
      this.mainContainer.innerHTML = '';
      this.loadContacts();
    });

    form.addEventListener('submit', event => {
      event.preventDefault();
      let data = contact ? createPostData(form, contact) : createPostData(form);
      let json = JSON.stringify(data);

      let xhr = new XMLHttpRequest();
      xhr.open(method, form.action);
      xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');

      xhr.addEventListener('load', event => {
        if (xhr.status !== 201) {
          alert('Could not create contact');
          form.reset();
        } else {
          this.loadContacts()
        }
      });

      xhr.send(json);
    });
  }

  formValidated(data, form) {
    let full_names = this.contacts.map(contact => contact.name);
    if (full_names.includes(data.full_name)) {
      alert('Name must be unique');
      form.reset();
    }
  }

  filterSearch(event) {
    if (event.key === 'Backspace') {
      searchValue = searchValue.slice(0, searchValue.length - 1);
    } else {
      searchValue += event.key;
    }

    let allListItems = document.querySelectorAll('li.contacts');
    allListItems.forEach(listItem => {
      let itemText = listItem.querySelector('.full-name').textContent.trim();
      if (!itemText.match(new RegExp(searchValue, 'i'))) {
        listItem.classList.add('hidden');
      } else {
        listItem.classList.remove('hidden');
      }
    });
  }

  filterByTag() {
    let allListItems = document.querySelectorAll('li.contacts');
    let selectedTags = Array.prototype.slice.call(document.querySelectorAll('a.selected-tag'));
    searchTags = selectedTags.map(tag => tag.textContent.trim());
    allListItems.forEach(listItem => {
      if (searchTags.length === 0) {
        listItem.classList.remove('hidden');
      }
      let listItemTags = Array.prototype.slice.call(listItem.querySelectorAll('.contact-tag'));
      let tags = listItemTags.map(tag => tag.textContent.trim());
      searchTags.forEach(searchTag => {
        if (tags.indexOf(searchTag) === -1) {
          listItem.classList.add('hidden');
        } else {
          listItem.classList.remove('hidden');
        }
      })
    });
  }
}

document.addEventListener('DOMContentLoaded', event => {
  let mainContainer = document.querySelector('.main-container');

  let contactsList = new ContactsList(mainContainer);

  document.body.addEventListener('click', function eventHanlder(event) {
    function classListContains(className) {
      return event.target.classList.contains(className);
    }

    switch (true) {
      case classListContains('add-contact'):
        contactsList.renderCreateContactForm(event.target);
        break;
      case classListContains('delete-contact'):
        contactsList.deleteContact(event.target);
        break;
      case classListContains('edit-contact'):
        contactsList.renderEditContactForm(event.target);
        break;
      case classListContains('tag-item'):
        contactsList.filterByTag(event.target);
        break;
    }
  });

  document.querySelector('#searchbar').addEventListener('keydown', event => {
    contactsList.filterSearch(event);
  });

  document.getElementById('create-tag').addEventListener('submit', event => {
    event.preventDefault();
    contactsList.addTagToList(event);
  });

  document.querySelector('.tags-list').addEventListener('click', event => {
    event.preventDefault();
    if (event.target.tagName = 'A') {
      event.stopPropagation();
      event.target.classList.toggle('selected-tag');
      contactsList.filterByTag();
    }
  });
});
