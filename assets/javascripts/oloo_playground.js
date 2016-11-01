var app;
var Todo;

(function () {
  Todo = {
    toggleComplete: function () {
      this.completed = !this.completed;
    },

    update: function (data) {
      data.forEach(function (obj) {
        this[obj.name] = obj.value;
      }, this);

      this.due_date = (this.month && this.year) ? (this.month + '/' + this.year) : 'No Due Date';
    },

    init: function (data) {
      this.completed = false;
      this.id = app.collection.getLastId() + 1;
      this.update(data);
      return this;
    },
  },

  app = {
    collection: {
      allTodos: [],
      listNames: [],
      activeList: '',
      navSection: '',

      getListNames: function () {
        var listNames = [];
        this.allTodos.forEach(function (todo) {
          if (!listNames.includes(todo.due_date)) {
            listNames.push(todo.due_date);
          }
        });

        return this.sortByDate(listNames);
      },

      totalCount: function () {
        return this.allTodos.length;
      },

      completedCount: function () {
        return this.allTodos.filter(function (todo) {
          return todo.completed;
        }).length;
      },

      activeCount: function () {
        return this.filteredCollection().length;
      },

      filteredCollection: function () {
        var result = this.allTodos.filter(function (todo) {
          if (this.activeList === 'All Todos') {
            return todo;
          } else if (this.activeList === 'Completed') {
            return todo.completed;
          } else if (this.navSection === 'all_todos') {
            return this.activeList === todo.due_date;
          } else if (this.navSection === 'complete') {
            return (this.activeList === todo.due_date) && todo.completed;
          }
        }, this);

        return result.sort(function (todo1, todo2) { return todo1.completed; });
      },

      removeTodoFromCollection: function (todoId) {
        this.allTodos = this.allTodos.filter(function (item) {
          return item.id !== +todoId;
        });
      },

      getTodo: function (id) {
        var foundItem;
        this.allTodos.forEach(function (item) {
          if (item.id === +id) {
            foundItem = item;
            return false;
          }
        });

        return foundItem;
      },

      getLastId: function () {
        var lastId = function () {
          var lastId = 0;
          this.allTodos.forEach(function (todo) {
            if (todo.id > lastId) lastId = todo.id;
          });

          return lastId;
        }.bind(this);

        return lastId();
      },

      sortByDate: function (lists) {
        function dateString(list) {
          var date = list.split('/');
          if (date[0] === 'No Due Date') return '2000 01';
          return ('20' + date[1] + ' ' + date[0]);
        }

        return lists.sort(function (list1, list2) {
          list1 = dateString(list1);
          list2 = dateString(list2);
          return new Date(list1) - new Date(list2);
        });
      },
    },

    bindEvents: function () {
      $('main').on('click', '#new', this.toggleModal.bind(this));
      $('main').on('click', 'nav li', this.renderAll.bind(this));
      $('main').on('click', '#content tbody td:first-child', this.toggleCompleteTodo.bind(this));
      $('main').on('click', '#content tbody span', this.toggleModal.bind(this));
      $('main').on('click', '#content tbody td.trash', this.destroyTodo.bind(this));
      $(window).on('unload', this.storeCollection.bind(this));
      $(document).on('keyup', this.escape.bind(this));
    },

    bindModalEvents: function () {
      $('form').on('submit', this.updateTodo.bind(this));
      $('.modal button').on('click', this.markComplete.bind(this));
      $('.modal_layer').on('click', this.toggleModal.bind(this));
    },

    cacheTemplates: function () {
      var $primary         = $('#primary').remove();
      var $todo            = $('#todo').remove();
      var $navItem         = $('#navItem').remove();
      var $completeNavItem = $('#completeNavItem').remove();
      var $modal           = $('#modal').remove();

      this.primaryTmpl     = Handlebars.compile($primary.html());
      this.todoTmpl        = Handlebars.compile($todo.html());
      this.modalTmpl       = Handlebars.compile($modal.html());

      Handlebars.registerPartial('todo', $todo.html());
      Handlebars.registerPartial('navItem', $navItem.html());
      Handlebars.registerPartial('completeNavItem', $completeNavItem.html());
    },

    registerHelpers: function () {
      Handlebars.registerHelper('select', function (selected, options) {
        return options.fn(this).replace(
        new RegExp(' value=\"' + selected + '\"'),
        '$& selected="selected"');
      });

      Handlebars.registerHelper('counter', function () {
        return app.collection.allTodos.filter(function (todo) {
          return todo.due_date === String(this);
        }, this).length;
      });

      Handlebars.registerHelper('completeCounter', function () {
        return app.collection.allTodos.filter(function (todo) {
          return (todo.due_date === String(this)) && todo.completed;
        }, this).length;
      });

      Handlebars.registerHelper('ifHasComplete', function (item, options) {
        if (Handlebars.helpers.completeCounter.call(this) > 0) return options.fn(this);
      });
    },

    toggleModal: function (e) {
      var todo;
      if (e) todo = this.collection.getTodo($(e.currentTarget).closest('tr').attr('data-id'));

      if ($('div.modal').length === 1) {
        $('div.modal, div.modal_layer').remove();
      } else {
        $('main').append(this.modalTmpl(todo));
        this.bindModalEvents();
      }
    },

    markComplete: function (e) {
      var todoId = $(e.currentTarget).closest('form').attr('data-editing');
      var todo = this.collection.getTodo(todoId);

      e.preventDefault();

      if (todoId === '') {
        alert('You must create an item before marking it as complete!');
      } else if (todo.completed) {
        alert('That item is already marked complete!');
      } else {
        this.toggleModal();
        todo.toggleComplete();
        this.renderAll();
      }
    },

    toggleCompleteTodo: function (e) {
      var $todo = $(e.target);
      var todo = this.collection.getTodo($todo.closest('tr').attr('data-id'));

      // prevents the event firing when span is clicked. Clicking span fires toggleModal instead.
      if ($todo.children().length === 0) return;

      todo.toggleComplete();
      this.renderAll();
    },

    updateTodo: function (e) {
      var data = $(e.target).serializeArray();
      var todoId = $(e.currentTarget).closest('form').attr('data-editing');
      var todo;

      e.preventDefault();

      if (todoId) {
        todo = this.collection.getTodo(todoId);
        todo.update(data);
      } else {
        todo = Object.create(Todo).init(data);
        this.collection.allTodos.push(todo);
      }

      this.toggleModal();
      this.renderAll();
    },

    destroyTodo: function (e) {
      var dataId = $(e.currentTarget).parent().attr('data-id');
      this.collection.removeTodoFromCollection(dataId);
      localStorage.removeItem(dataId);
      this.renderAll();
    },

    renderAll: function (e) {
      var $list;
      this.collection.listName   = e ? $(e.currentTarget).attr('data-title') : 'All Todos';
      this.collection.navSection = e ? $(e.currentTarget).closest('div').attr('class') : 'all_todos';
      this.collection.activeList = this.collection.listName;
      this.collection.listNames  = this.collection.getListNames();

      $('main').html(this.primaryTmpl(this.collection));

      if (e) {
        $list = $('nav .' + this.collection.navSection).find('[data-title="' + this.collection.listName + '"]');
        this.setClass($list);
      }
    },

    setClass: function ($list) {
      var activeClass = 'active';

      $('nav .' + activeClass).removeClass(activeClass);
      $list.addClass(activeClass);
      $list.find('span').addClass(activeClass);
    },

    escape: function (e) {
      var escapeCode = 27;
      if (e.keyCode === escapeCode) this.toggleModal();
    },

    restoreProtoMethods: function (object) {
      var todo = Object.create(Todo);
      for (var prop in object) {
        todo[prop] = object[prop];
      }

      return todo;
    },

    storeCollection: function () {
      this.collection.allTodos.forEach(function (todo) {
        localStorage.setItem(todo.id, JSON.stringify(todo));
      });
    },

    loadCollection: function () {
      for (var key in localStorage) {
        var obj = JSON.parse(localStorage.getItem(key));
        this.collection.allTodos.push(this.restoreProtoMethods(obj));
      }
    },

    init: function () {
      this.bindEvents();
      this.cacheTemplates();
      this.registerHelpers();
      this.loadCollection();
      this.renderAll();
    },
  };
})();

$(app.init.bind(app));
