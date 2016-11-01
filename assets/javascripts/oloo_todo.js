// prototypal object creation pattern OlOO
// without using jquery to write to the DOM -- use handlebars to render, transform collection into array of objects with keys derived (mvvm) when you

var app;

(function () {
  app = {
    collection: [],
    bindEvents: function () {
      $('nav ul').on('click', 'li', this.renderList.bind(this));
      $('#content tbody').on('click', 'td:first-child', this.toggleStatus.bind(this));
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

        // todo = { id: ++this.lastId, completed: false, };
        // this.updateTodoData(todo, data);
        // this.collection.push(todo);
        // this.renderToNav(todo, '.all_todos');
        // $('#content tbody').append(this.todoTemplate(todo));
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
