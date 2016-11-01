// prototypal object creation pattern OlOO
// without using jquery to write to the DOM -- use handlebars to render, transform collection into array of objects with keys derived (mvvm) when you

var todos;

(function () {
  todos = {
    collection: [],
    bindEvents: function () {
      $('nav ul').on('click', 'li', this.renderList.bind(this));
      $('#new').on('click', this.resetModalForNewTodo.bind(this));
      $('form').on('submit', this.updateTodo.bind(this));
      $('.modal_layer').on('click', this.hideModal.bind(this));
      $('.modal button').on('click', this.markComplete.bind(this));
      $('#content tbody').on('click', 'span', this.retrieveTodoDataForEdit.bind(this));
      $('#content tbody').on('click', 'td:first-child', this.toggleStatus.bind(this));
      $('#content tbody').on('click', 'td.trash', this.destroyTodo.bind(this));
      $(window).on('unload', this.saveTodoData.bind(this));
      $(document).on('keyup', this.escape.bind(this));
    },

    cacheTemplates: function () {
      var $todoItem = $('#todoItem').remove();
      var $todoList = $('#todoList').remove();
      var $navTodoItem = $('#navTodoItem').remove();

      this.todoTemplate = Handlebars.compile($todoItem.html());
      this.todoListTemplate = Handlebars.compile($todoList.html());
      this.navTodoTemplate = Handlebars.compile($navTodoItem.html());

      Handlebars.registerPartial('todoItem', $todoItem.html());
    },

    retrieveTodoDataForEdit: function (e) {
      var todo = this.getTodo($(e.currentTarget).closest('tr').attr('data-id'));
      $('.modal form').attr('data-editing', todo.id);
      $('.modal').find('input[type="text"]').val(todo.title);
      $('.modal').find('textarea').val(todo.description);
      $('.modal').find('select[name="day"]>option[value="' + todo.day + '"]').prop('selected', true);
      $('.modal').find('select[name="month"]>option[value="' + todo.month + '"]').prop('selected', true);
      $('.modal').find('select[name="year"]>option[value="' + todo.year + '"]').prop('selected', true);
      $('.modal, .modal_layer').show();
    },

    resetModalForNewTodo: function () {
      $('.modal form').attr('data-editing', '');
      $('.modal').find('input[type="text"]').val('');
      $('.modal').find('textarea').val('');
      $('.modal').find('select[name="day"]>option[value=""]').prop('selected', true);
      $('.modal').find('select[name="month"]>option[value=""]').prop('selected', true);
      $('.modal').find('select[name="year"]>option[value=""]').prop('selected', true);
      $('.modal, .modal_layer').show();
    },

    markComplete: function (e) {
      var todoId = $(e.currentTarget).closest('form').attr('data-editing');
      var todo = this.getTodo(todoId);

      e.preventDefault();
      if (todoId === '') {
        alert('You must create an item before marking it as complete!');
      } else if (todo.completed) {
        alert('That item is already marked complete!');
      } else {
        $('#content tbody tr[data-id="' + todoId + '"] td:first-child').trigger('click');
        this.hideModal();
      }
    },

    renderToNav: function (todo, navSection) {
      var $list = $('nav ' + navSection + ' [data-title="' + todo.due_date + '"]');

      if ($list.length === 0) {
        $('nav ' + navSection + ' ul').append(this.navTodoTemplate(todo));
        $('nav ' + navSection + ' ul').append(this.sortByDate($('nav ' + navSection + ' li')));
        $list = $('nav ' + navSection + ' [data-title="' + todo.due_date + '"]');
      }

      if (navSection === '.complete') this.incrementDataTotal(this.getListByTitle('Completed Todos'));
      if (navSection === '.all_todos') this.incrementDataTotal(this.getListByTitle('All Todos'));
      this.incrementDataTotal($list);
    },

    removeFromNav: function (todo, navSection) {
      var $list = $('nav ' + navSection + ' [data-title="' + todo.due_date + '"]');

      this.decrementDataTotal($list);
      if (navSection === '.complete') this.decrementDataTotal(this.getListByTitle('Completed Todos'));
      if (navSection === '.all_todos') this.decrementDataTotal(this.getListByTitle('All Todos'));
      if (this.getDataTotal($list) === 0) this.removeList($list);
    },

    updateTodoData: function (todo, data) {
      data.forEach(function (obj) {
        todo[obj.name] = obj.value;
      }, this);

      todo.due_date = (todo.month && todo.year) ? (todo.month + '/' + todo.year) : 'No Due Date';
    },

    updateTodo: function (e) {
      var data = $(e.currentTarget).serializeArray();
      var todoId = +($(e.currentTarget).attr('data-editing'));
      var todo = this.getTodo(todoId);

      e.preventDefault();

      if (todo) {
        this.removeFromNav(todo, '.all_todos');
        if (todo.completed) this.removeFromNav(todo, '.complete');
        this.updateTodoData(todo, data);
        this.getListById(todo.id).replaceWith(this.todoTemplate(todo));
        this.renderToNav(todo, '.all_todos');
        if (todo.completed) this.renderToNav(todo, '.complete');
      } else {
        todo = { id: ++this.lastId, completed: false, };
        this.updateTodoData(todo, data);
        this.collection.push(todo);
        this.renderToNav(todo, '.all_todos');
        $('#content tbody').append(this.todoTemplate(todo));
      }

      this.sortByStatus($('#content tbody'));
      this.hideModal();
      this.returnHome();
    },

    toggleStatus: function (e) {
      var $todo = $(e.target);
      var todo = this.getTodo($todo.closest('tr').attr('data-id'));
      var $list = $('.complete [data-title="' + todo.due_date + '"]');

      if ($todo.children().length === 0) return;
      todo.completed = !todo.completed;
      $todo.toggleClass('check').toggleClass('complete');

      if (todo.completed) {
        this.renderToNav(todo, '.complete');
      } else {
        this.removeFromNav(todo, '.complete');
      }

      this.sortByStatus($('#content tbody'));
      this.returnHome();
    },

    renderList: function (e) {
      var $list = $(e.currentTarget);
      var navSection = $list.closest('div').attr('class');
      var listName = $list.attr('data-title');
      var filteredTodos = this.collection.filter(function (todo) {
        if (listName === 'Completed Todos') { return todo.completed;
        } else if (listName === 'All Todos') { return todo;
        } else if (navSection === 'complete') {
          return todo.completed && (todo.due_date === listName);
        } else { return todo.due_date === listName; }
      });

      this.setClass($list);
      this.updateHeading($list);
      $('#content tbody').html(this.todoListTemplate({ todo: filteredTodos }));
      this.sortByStatus($('#content tbody'));
    },

    removeList: function ($list) {
      $list.remove();
      this.returnHome();
    },

    removeTodoData: function (id) {
      this.collection = this.collection.filter(function (item) {
        return item.id !== +id;
      });
    },

    destroyTodo: function (e) {
      var dataId = $(e.currentTarget).parent().attr('data-id');
      var todo = this.getTodo(dataId);
      var $parentList = $('[data-title="' + todo.due_date + '"]');

      this.removeTodoData(dataId);
      localStorage.removeItem(dataId);
      $(e.currentTarget).parent().remove();
      this.removeFromNav(todo, '.all_todos');
      if (todo.completed) this.removeFromNav(todo, '.complete');
    },

    getTodo: function (id) {
      var foundItem;
      this.collection.forEach(function (item) {
        if (item.id === +id) {
          foundItem = item;
          return false;
        }
      });

      return foundItem;
    },

    getListByTitle: function (title) {
      return $('[data-title="' + title + '"]');
    },

    getListById: function (id) {
      return $('[data-id="' + id + '"]');
    },

    getDataTotal: function ($list) {
      return +($list.attr('data-total'));
    },

    incrementDataTotal: function ($list) {
      var dataTotal = this.getDataTotal($list);
      $list.attr('data-total', ++dataTotal);
      $list.find('span').text(dataTotal);
    },

    decrementDataTotal: function ($list) {
      var dataTotal = this.getDataTotal($list);
      $list.attr('data-total', --dataTotal);
      $list.find('span').text(dataTotal);
    },

    setClass: function ($list) {
      var activeClass = 'active';

      $('nav .' + activeClass).removeClass(activeClass);
      $list.addClass(activeClass);
      $list.find('span').addClass(activeClass);
    },

    updateHeading: function ($list) {
      $('#content h1').html($list.html());
    },

    sortByStatus: function ($list) {
      var $complete = $list.find('td[class="complete"]').closest('tr').remove();
      var $incomplete = $list.find('td[class="check"]').closest('tr').remove();

      $list.prepend($incomplete).append($complete);
    },

    sortByDate: function ($lists) {
      function dateString(list) {
        var date = $(list).attr('data-title').split('/');
        if (date[0] === 'No Due Date') return '2000 01';
        return ('20' + date[1] + ' ' + date[0]);
      }

      return $lists.sort(function (list1, list2) {
        list1 = dateString(list1);
        list2 = dateString(list2);
        return new Date(list1) - new Date(list2);
      });
    },

    returnHome: function () {
      $('[data-title="All Todos"]').trigger('click');
    },

    hideModal: function () { $('.modal, .modal_layer').hide(); },

    escape: function (e) {
      var escapeCode = 27;
      if (e.keyCode === escapeCode) this.hideModal();
    },

    saveTodoData: function () {
      this.collection.forEach(function (todo) {
        localStorage.setItem(todo.id, JSON.stringify(todo));
      });
    },

    loadTodoData: function () {
      for (var key in localStorage) {
        var todo = JSON.parse(localStorage.getItem(key));
        this.collection.push(todo);
      }
    },

    renderNav: function () {
      this.collection.forEach(function (todo) {
        this.renderToNav(todo, '.all_todos');
        if (todo.completed) this.renderToNav(todo, '.complete');
      }, this);
    },

    getLastId: function () {
      var lastId = 0;
      this.collection.forEach(function (todo) {
        if (todo.id > lastId) lastId = todo.id;
      });

      return lastId;
    },

    init: function () {
      this.bindEvents();
      this.cacheTemplates();
      this.loadTodoData();
      this.lastId = this.getLastId();
      this.renderNav();
      this.returnHome();
    },
  };
})();

$(todos.init.bind(todos));
