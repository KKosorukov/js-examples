var VictoriaTests = (function() {
  return {
    config: null,
    currentTest : null, // Текущий тест
    currentStep : 0, // Текущий шаг
    container : '.viewport-question',
    nextBtn : '#btn-next',
    numQuestionsCont : '.viewport-question .step', // Текущий вопрос / Количество вопросов
    answers : [], // Ответы, данные пользователем. �спользуются для подсчёта результатов и вывода финального экрана,
    delay : 300, // Задержка для анимации в мс
    FB: null, //  FB API Object
    VK: null, // VK API Object
    FBLoginResponse : null, // Ответ сервера о статусе авторизованности пользователя
    result : null, // � езультат теста
    closeTimeout : 15000, // После этого времени страница сбрасывается на стартовую
    deviceType : null,

    bindEvents: function () {
      // Таймер по бездействию
      if(this.deviceType == 'tablet') {
        // Обнулять таймер бездействия, если есть нажатие или клик
        $(document).on('click keydown', $.proxy(function() {
          //console.log("Clear Timer");
          //this.setCloseTimer();
        }, this));
      }

      // Следующий вопрос
      $(this.nextBtn).on('click', $.proxy(function() {
        var choosed = $('input[name="answer"]:checked').val();
        if(typeof(choosed) == 'undefined' || $(this.nextBtn).hasClass('disabled')) {
          return false;
        }

        this.answers.push(choosed);

        $(this.nextBtn).addClass('disabled');

        $(this.container).find('ul').css({
          'position' : 'relative'
        }).animate({
          'left' : 200,
          'opacity' : 0
        }, {
          'duration' : this.delay,
          'complete' : $.proxy(function() {
            $(this.container).find('ul').css({
              'opacity' : 1,
              'left' : 0
            });
            this.next();
          }, this)
        });

        return false;
      }, this));

      /**
       * Подтверждение формы по enter
       */
      $(document).on('keydown', '#email', $.proxy(function(e) {
          if(e.keyCode == 13) {
            $('#btn-email-submit').click();
          }
      }, this));

      // Шаринг
      $(document).on('click', '#btn-email-submit', $.proxy(function(e) {
        ga('send', {
          hitType: 'event',
          eventCategory: 'Email',
          eventAction: 'Submit',
          eventLabel: 'Email Submitting'
        });

        var email = $(this.container).find('#email').val();
        if(!/^([a-z0-9_-]+\.)*[a-z0-9_-]+@[a-z0-9_-]+(\.[a-z0-9_-]+)*\.[a-z]{2,6}$/.test(email)) {

          $(this.container).find('#email').css({
            'border' : '1px solid #e9292a'
          });

          $(this.container).find('.email-cont .error').html('Кажется, email указан неверно. Проверьте, пожалуйста.');

          return false;
        }

        $.ajax({
          url: '../polovinki/send-to-email.php',
          type: 'POST',
          data: {
            'mail' : $.trim(email),
            'gender' : this.currentTest.id == 'gender-man' ? 0 : 1,
            'type' : $('html').hasClass('tablet') ? 1 : 0,
            'fruit' : this.currentTest.trades[this.result].id
          },
          dataType: 'JSON',
          cache: false,
          success: function (data) {

          }
        });


        $(this.container).find('.email-cont').hide(this.delay, function () {
          $(this).remove();
        });

        if(this.deviceType != 'tablet') {

          $(this.container).find('p').html(this.currentTest.shareDescription);
            if(this.deviceType != 'mobile') {
                /*$(this.container).append(
                    $('<a>').prop({
                        'href': '#',
                        'id': 'contest-more'
                    }).append(
                        'Подробнее',
                        $('<em>')
                    )
                );*/
            }

          $(this.container).append(
            $('<div>').prop({
              'class' : 'buttons'
            }).css({
              'display' : 'none'
            }).append(
              $('<a>').prop({
                'href' : '#',
                'class' : 'btn',
                'id' : 'btn-facebook'
              }).html('f'),
              $('<a>').prop({
                'href' : '#',
                'class' : 'btn',
                'id' : 'btn-vk'
              }).html('В')
              /*$('<a>').prop({
                'href' : '#',
                'class' : 'btn',
                'id' : 'btn-od'
              }).html('O') */
            ).fadeIn(this.delay)
          );
        } else {
          $(this.container).find('p').html('Поздравляем любимых с праздником! <br /><br /> Мы отправили купон со скидкой на вашу электронную почту. <br /><br />');
          // Принудительно устанавливаем таймер на 20 сек до закрытия
          $(document).off('click keydown');
          this.setCloseTimer();
        }

      }, this));


      // Получить скидку, планшет
      $(document).on('click', '#btn-discount', $.proxy(function() {
        ga('send', {
          hitType: 'event',
          eventCategory: 'Discount',
          eventAction: 'DiscountSubmit',
          eventLabel: 'Getting Discount'
        });

        $('.viewport-final').find('p, h3').fadeOut(this.delay);
        $('#btn-discount').fadeOut(this.delay, $.proxy(function() {
          $('#btn-discount').remove();
          this.displayEmailContainer();
          $('.viewport-final').find('p, h3, .email-cont').fadeIn(this.delay);
        }, this));
      }, this));

      // Начать тест, планшет
      $(document).on('click', '#btn-begin', $.proxy(function(e) {
        var choosed = $('input[name="gender"]:checked').val();
        if(choosed == 1) {
          location.href = 'coupon.html#gender-woman';
        }
        if(choosed == 2) {
          location.href = 'coupon.html#gender-man';
        }
        return false;
      }, this));

      /**
       * Шаринг VK
       */
      $(document).on('click', this.config.vkBtn, $.proxy(function() {
        ga('send', {
          hitType: 'event',
          eventCategory: 'Share',
          eventAction: 'ShareVK',
          eventLabel: 'VK sharing'
        });

        var i = location.protocol + "//" + location.host + '/polovinki';
        var r = "#подаркилюбимым";
        var imagePath = this.currentTest.trades[this.result].shareImg;
        var n = "http://vkontakte.ru/share.php?url=" + encodeURIComponent(i) + "&title=" + encodeURIComponent(r) + "&image=" + encodeURIComponent(imagePath) + "&noparse=false&t=" + (new Date().getTime());

        var newWin = window.open(n, "", "toolbar=0,status=0,width=626,height=436")

        newWin.onunload = function () {
          location.reload();
        };

        newWin.focus();
      }, this));

      /**
       * Шаринг Одноклассники
       * @type {string}
       */
      $(document).on('click', this.config.odBtn, $.proxy(function() {
        ga('send', {
          hitType: 'event',
          eventCategory: 'Share',
          eventAction: 'ShareOD',
          eventLabel: 'OD sharing'
        });

        url  = 'http://www.odnoklassniki.ru/dk?st.cmd=addShare&st.s=1';
        url += '&st.comments=' + encodeURIComponent('Шаринг');
        url += '&st._surl=' + encodeURIComponent(this.currentTest.trades[this.result].shareImg);

        var newWin = window.open(url, "", "toolbar=0,status=0,width=626,height=436")

        newWin.onunload = function () {
          location.reload();
        };

        newWin.focus();
      }, this));

      /**
       * Шаринг FB
       */
      $(document).on('click', this.config.fbBtn, $.proxy(function() {
        ga('send', {
          hitType: 'event',
          eventCategory: 'Share',
          eventAction: 'ShareFB',
          eventLabel: 'FB sharing'
        });

        FB.ui({
          'method': 'feed',
          'picture' :  this.currentTest.trades[this.result].shareFbImg,
          'caption' : 'www.victoria-group.ru',
          'name' : 'Подарок с характером... Второй половинки!',
          'hashtag' : '#подаркилюбимым',
          'display' : 'touch',
          'link' : location.host + '/polovinki'
        },function (response) {
          if (response && !response.error) {
            location.reload();
          }
        });
      }, this));

        /**
         * Показ конкурсного баннера
         */
      $(document).on('click', '#contest-more, #terms-link', $.proxy(function(e) {
        $('body').append(
            $('<div>').prop({
                'id' : 'overlay'
            }),
            $('<div>').prop({
                'id' : 'contest-banner-cont',
                'class' : this.currentTest.id == 'gender-woman' ? 'woman' : 'man'
            }).append(
                $('<a>').prop({
                    'href' : '#',
                    'id' : 'banner-cross'
                }),
                $('<h3>').html('Для участия в конкурсе:'),
                $('<ul>').append(
                    $('<li>').html('<span>Поделитесь результатом теста в одном из своих профилей социальных сетей VK или Facebook</span>'),
                    $('<li>').html('<span>Не удаляйте данную запись со стены своего профиля до даты завершения конкурса - 09.03.2017<span>'),
                    $('<li>').html('<span>Вступите в одно из сообществ сети супермаркетов "Виктория"<span>'),
                    $('<li>').html('<span>В комментариях записи одной из групп <a href="https://www.facebook.com/SupermarketVictoria/photos/a.187452808006527.48295.187449514673523/1312564198828710/?type=3&theater" target="_blank" class="fb-btn-popup">f</a> <a href="https://vk.com/supermarket_victoria?w=wall-36292241_5677" target="_blank" class="vk-btn-popup">В</a> "Виктории" напишите результат Вашего теста, а также, что Вы собираетесь подарить своей второй половинке!</span>')
                )
            ).fadeIn(this.delay)
        )
      }, this));

      /**
       * Закрытие оверлея и попапа
       */
      $(document).on('click', '#banner-cross, #overlay', $.proxy(function(e) {
         $('#overlay, #contest-banner-cont').fadeOut(this.delay, function() {
             $(this).remove();
         })
      }, this));
    },

    /**
     * Начать тест
     */
    beginTest : function() {
      if(this.config && this.config.start) {
        this.currentTest = this.searchTest(this.config.start);
      }

      if(!this.currentTest) {
        console.log('Неизвестный тест для запуска');
        return false;
      }

      // � азный фон в зависимости от того, планшетка, мобилка или десктоп
      if(this.deviceType == 'tablet' || this.deviceType == 'pad') {
        $(this.container).css({
          'backgroundImage' : 'url(' +  this.currentTest.questionsBg.pad + ')',
          'backgroundPosition' : 'right top',
          'backgroundRepeat' : 'no-repeat',
        }).addClass(this.currentTest.addContClass);
      }

      if(this.deviceType == 'mobile') {
        $(this.container).css({
          'backgroundImage': 'url(' + this.currentTest.questionsBg.mobile + ')',
          'backgroundPosition': 'right top',
          'backgroundRepeat': 'no-repeat',
        }).addClass(this.currentTest.addContClass);
      }

      if(this.deviceType == 'desktop') {
        $(this.container).css({
          'background' : 'url(' +  this.currentTest.questionsBg.desktop + ') no-repeat'
        }).addClass(this.currentTest.addContClass);
      }

      $(this.nextBtn).addClass(this.currentTest.addContClass);

      this.displayStep(this.currentStep);
    },

    /**
     * Отобразить следующий вопрос
     */
    next : function() {
      if(this.currentStep + 1 < this.currentTest.items.length) {
        this.currentStep++;
        this.displayStep(this.currentStep);
      } else {
        this.displayFinalScreen();
      }
    },

    /**
     * Отобразить экран с результатами
     */
    displayFinalScreen : function() {
      // Считаем результат: группируем по вариантам ответов
      var groups = Array.apply(null, new Array(this.currentTest.items[0].variants.length)).map(Number.prototype.valueOf,0);
      for(var i = 0; i < this.answers.length; i++) {
        groups[this.answers[i]]++;
      }

      // �щем максимальное количество
      var max = 0;
      var result = null;
      for(var i = 0; i < groups.length; i++) {
        if(groups[i] > max) {
          result = i;
          max = groups[i];
        }
      }

      this.result = result;

      // Чистим всё ненужное
      $(this.container).find('ul').remove();
      $('#main h2').remove();
      $(this.nextBtn).remove();
      $(this.numQuestionsCont).remove();

      // � отображаем результат
      $(this.container)
        .removeClass('viewport-question')
        .addClass('viewport-final');

      this.container = $('.viewport-final');

      this.currentTest.finalScreen[result](this.container, this.deviceType);

      if(this.deviceType == 'desktop' || this.deviceType == 'pad') {
        this.displayEmailContainer();
      }

      if(this.deviceType == 'tablet' || this.deviceType == 'mobile') {
        this.createDiscountButton();
      }

      if(this.deviceType == 'mobile') {
        $('#terms-link').remove();
      }

      $('.viewport-final').find('.email-cont, p, h3, #final-fruit, #btn-discount').fadeIn(this.delay);
    },

    /**
     * Кнопка "получить скидку" на планшетах
     */
    createDiscountButton : function() {
      var btn = $('<a>').prop({
        'class' : 'btn',
        'href' : '#',
        'id' : 'btn-discount'
      }).append(
        'Получите скидку',
        $('<span>').prop({
          'class' : 'arrow'
        })
      );
      if(this.deviceType != 'mobile') {
        $(btn).appendTo($('#main'));
      } else {
        $(btn).appendTo(this.container);
      }
    },

    /**
     * Отобразить контейнер для ввода email
     */
    displayEmailContainer : function() {
      if(this.deviceType == 'desktop') {
        this.container.find('p').append(
          ' Оставьте свой e-mail и получите скидку 20% на ' + this.currentTest.trades[this.result].description + ' для ' + (this.container.hasClass('woman') ? 'нее!' : 'него!')
        );
      }

      this.container.append(
        $('<div>').prop({
          'class' : 'email-cont'
        }).append(
          $('<span>').prop({
            'class' : 'error'
          }),
          $('<input>').prop({
            'type' : 'email',
            'id' : 'email',
            'placeholder' : 'Ваш@e-mail'
          }),
          $('<a>').prop({
            'href' : '#',
            'class' : 'btn',
            'id' : 'btn-email-submit'
          }).append(
            $('<span>').prop({
              'class' : 'arrow'
            })
          )
        ).css({
          'display' : 'none'
        })
      );

      // Планшетка, другой текст при абзаце
      if(this.deviceType == 'tablet' || this.deviceType == 'mobile') {
        this.container
          .find('p')
          .html('Оставьте свой e-mail и получите скидку 20% на ' + this.currentTest.trades[this.result].description + ' для ' + (this.container.hasClass('woman') ? 'нее!' : 'него!'));
      }
    },

    /**
     * Таймер автозакрытия по бездействию
     */
    setCloseTimer : function() {
      if(this.timer) {
        clearTimeout(this.timer);
      }
      this.timer = setTimeout($.proxy(function() {
        location.href = 'index.html';
      }), this.closeTimeout);
    },


    displayStep : function(step) {
      $(this.container).find('h3, ul').hide();

      $(this.container)
        .find('h3')
        .html(this.currentTest.items[step].header);

      $(this.container)
        .find('li')
        .remove();

      /**
       * Формируем список ответов
       */
      for(var i = 0; i < this.currentTest.items[step].variants.length; i++) {
        $(this.container)
          .find('ul')
          .append(
            $('<li>').append(
              $('<div>')
                .prop({
                  'class' : 'radio-wrap'
                })
                .append(
                $('<input>').prop({
                  'type' : 'radio',
                  'value' : this.currentTest.items[step].variants[i].value,
                  'name' : 'answer',
                  'id' : 'answer' + i
                })
              ),
              $('<label>')
                .prop({
                  'for' : 'answer' + i
                })
                .html(this.currentTest.items[step].variants[i].display)
            )
          )
      }

      if(this.deviceType == 'mobile') {
        $('#btn-next').appendTo('.viewport-question');
        if($('.viewport-question').length > 0) {
          $('#terms-link').appendTo('.viewport-question');
        }
      }

      /**
       * Текущий вопрос / количество вопросов
       */
      $(this.numQuestionsCont).html((this.currentStep + 1) + '/' + this.currentTest.items.length);
      $(this.container).find('ul, h3').fadeIn(this.delay);
      $(this.nextBtn).removeClass('disabled');

      return this;
    },

    /**
     * Поиск теста
     * @param testName
     */
    searchTest : function(testName) {
      for(var i in this.config.list) {
        if(this.config.list[i].id == testName) {
          return this.config.list[i];
        }
      }
      return null;
    },

    /**
     * Установить сабфутер
     */
    setSubFooter : function() {
      $('#main').append(
        $('<img>').prop({
          'src' : this.currentTest.subFooterUrl,
          'width' : 963,
          'height' : 114,
          'alt' : '',
          'title' : '',
          'id' : 'subfooter'
        })
      );
    },

    /**
     * Получить статус авторизации на Facebook
     * @constructor
     */
    FBGetLoginStatus : function() {
      /**
       * Получить инфо о статусе пользователя: залогинен или нет
       */
      var funcLoginStatusCallback = $.proxy(function (response) {
        this.FBLoginResponse = response;
      }, this);

      this.FB.getLoginStatus(funcLoginStatusCallback);
    },

    /**
     * �нициализация Facebook API
     */
    FBInit: function () {
      window.fbAsyncInit = $.proxy(function () {
        FB.init(this.config.FBAppData);
        this.FB = FB;
        this.FBGetLoginStatus();
      }, this);

      (function (d, s, id) {
        var js, fjs = d.getElementsByTagName(s)[0];
        if (d.getElementById(id)) {
          return;
        }
        js = d.createElement(s);
        js.id = id;
        js.src = "//connect.facebook.net/en_US/sdk.js";
        fjs.parentNode.insertBefore(js, fjs);
      }(document, 'script', 'facebook-jssdk'));
    },

    /**
     * Получить статус авторизации на Facebook
     * @constructor
     */
    FBGetLoginStatus : function() {
      /**
       * Получить инфо о статусе пользователя: залогинен или нет
       */
      var funcLoginStatusCallback = $.proxy(function (response) {
        this.FBLoginResponse = response;
      }, this);

      this.FB.getLoginStatus(funcLoginStatusCallback);
    },

    /**
     * �нициализировать счётчик GA
     */
    GAInit: function () {
      (function (i, s, o, g, r, a, m) {
        i['GoogleAnalyticsObject'] = r;
        i[r] = i[r] || function () {
            (i[r].q = i[r].q || []).push(arguments)
          }, i[r].l = 1 * new Date();
        a = s.createElement(o),
          m = s.getElementsByTagName(o)[0];
        a.async = 1;
        a.src = g;
        m.parentNode.insertBefore(a, m)
      })(window, document, 'script', 'https://www.google-analytics.com/analytics.js', 'ga');

      ga('create', 'UA-91480959-1', 'auto');
      ga('send', 'pageview');
    },

    /**
     * �нициализация Yandex.Метрики
     * @constructor
     */
    YAMetrikaInit: function () {
      (function (d, w, c) {
        (w[c] = w[c] || []).push(function() {
          try {
            w.yaCounter42612059 = new Ya.Metrika({
              id:42612059,
              clickmap:true,
              trackLinks:true,
              accurateTrackBounce:true,
              webvisor:true
            });
          } catch(e) { }
        });

        var n = d.getElementsByTagName("script")[0],
          s = d.createElement("script"),
          f = function () { n.parentNode.insertBefore(s, n); };
        s.type = "text/javascript";
        s.async = true;
        s.src = "https://mc.yandex.ru/metrika/watch.js";

        if (w.opera == "[object Opera]") {
          d.addEventListener("DOMContentLoaded", f, false);
        } else { f(); }
      })(document, window, "yandex_metrika_callbacks");
    },

    /**
     * Детектирование устройства
     */
    detectDevice : function() {
      if(device.desktop()) {
        return 'desktop'
      } else {
        if($('html').hasClass('tablet')) {
          return 'tablet'
        }
        if(!$('html').hasClass('tablet') && $('html').hasClass('pad')) {
          if(device.mobile()) {
            if($(window).width() < $(window).height()) {
              return 'mobile';
            }
            if($(window).width() > $(window).height()) {
              return 'pad';
            }
          }
        }
      }
      return 'unknown';
    },

    init: function (config) {
      this.deviceType = this.detectDevice();

      if (config) {
        this.config = config;
      }

      this.beginTest();

      if($(this.container).length > 0) {
        this.setSubFooter();
      }

      if(this.deviceType == 'desktop') {
        $('.viewport-start').find('p.header:eq(1)').css({
          'visibility' : 'hidden'
        });
      }

      this.FBInit();
      this.GAInit();
      this.YAMetrikaInit();
      this.bindEvents();

      console.log(this.deviceType);

      return this;
    }
  };
});

$(function() {
  var startTest = location.hash.substr(1);
  if($.trim(startTest) == '') {
    startTest = 'gender-man';
  }

  /**
   * Запускаем тесты
   */
  new VictoriaTests().init({
    'vkBtn' : '#btn-vk',
    'fbBtn' : '#btn-facebook',
    'odBtn' : '#btn-od',
    'FBAppData': {
      'appId': '164376097391119',
      'xfbml': true,
      'version': 'v2.8',
      'oauth': true,
      'cookie': true
    },
    'VKAppData': {
      'apiId': '5755701'
    },
    start : startTest,
    list : [
      {
        id : 'gender-woman',
        questionsBg : {
          desktop : '../polovinki/img/coupon/bg-1.png',
          pad : '../polovinki/img/coupon/bg-1-pad.png',
          mobile : '../polovinki/img/coupon/bg-1-mobile.png'
        },
        subFooterUrl : '../polovinki/img/coupon/subfooter-woman.png',
        addContClass : 'man',
        trades : [
          {
            description : 'средства для бритья',
            shareImg : 'http://victoria-group.ru/polovinki/img/share/orange.jpg',
            shareFbImg : 'http://victoria-group.ru/polovinki/img/share/fb_orange.jpg',
            id : 'orange'
          },
          {
            description : 'электроинструмент и ручной инструмент',
            shareImg : 'http://victoria-group.ru/polovinki/img/share/eggplant.jpg',
            shareFbImg : 'http://victoria-group.ru/polovinki/img/share/fb_eggplant.jpg',
            id : 'eggplant'
          },
          {
            description : 'автотовары',
            shareImg : 'http://victoria-group.ru/polovinki/img/share/tomatoe_.jpg',
            shareFbImg : 'http://victoria-group.ru/polovinki/img/share/fb_tomatoe.jpg',
            id : 'tomatoe'
          },
          {
            description : 'товары для фитнеса и спортивное питание',
            shareImg : 'http://victoria-group.ru/polovinki/img/share/qiwi.jpg',
            shareFbImg : 'http://victoria-group.ru/polovinki/img/share/fb_qiwi.jpg',
            id : 'qiwi'
          }
        ],
        /**
         * На каждый вариант результата - по функции обработки
         */
        shareDescription : 'Поделитесь результатом теста со своей второй половинкой и друзьями в социальных сетях:',
        contestBanner : 'img/final/contest.png',
        finalScreen : [
          function(container, deviceType) {
            if(deviceType == 'desktop') {
              var backgroundUrl = '../polovinki/img/final/clean-bg-man.png';
              var fruitUrl = '../polovinki/img/final/orange.png';
            } else {
              var fruitUrl = '../polovinki/img/final/orange-pad.png'
            }

            if(deviceType == 'tablet' || deviceType == 'pad') {
              var backgroundUrl = '../polovinki/img/final/clean-bg-man-pad.png';
            }
            if(deviceType == 'mobile') {
              var backgroundUrl = '';
              $(container).css({
                'backgroundPosition' : 'right bottom'
              });
            }

            $(container).css({
              'backgroundImage' : 'url(' + backgroundUrl + ')'
            });

            $(container)
              .find('h3')
              .html('Ваш избранник - Заводной апельсин!');

            $(container).append(
              $('<img>').prop({
                'id' : 'final-fruit',
                'src' : fruitUrl,
                'alt' : '',
                'title' : ''
              })
            );

            $(container).append(
              $('<p>').html('Ваш избранник – заводной апельсин. Любит спорт и вечеринки, всегда хорошо выглядит. Наверняка тайно пользуется вашим кремом в той красивой баночке. Тот самый случай, когда пена для бритья – подходящий подарок!')
            );
          },
          function(container, deviceType) {
            if(deviceType == 'desktop') {
              var backgroundUrl = '../polovinki/img/final/clean-bg-man.png';
              var fruitUrl = '../polovinki/img/final/eggplant.png';
            } else {
              var fruitUrl = '../polovinki/img/final/eggplant-pad.png'
            }

            if(deviceType == 'tablet' || deviceType == 'pad') {
              var backgroundUrl = '../polovinki/img/final/clean-bg-man-pad.png';
            }

            if(deviceType == 'mobile') {
              var backgroundUrl = '';
              $(container).css({
                'backgroundPosition' : 'right bottom'
              });
            }

            $(container).css({
              'backgroundImage' : 'url(' + backgroundUrl + ')'
            }).append(
              $('<img>').prop({
                'id' : 'final-fruit',
                'src' : fruitUrl,
                'alt' : '',
                'title' : ''
              })
            );

            $(container)
              .find('h3')
              .html('Ваш избранник - Дикий баклажан!')

              $(container).append(
                $('<p>').html('Ваш любимый – дикий баклажан. Загадочный и нелюдимый интеллектуал. Одинаково хорошо разбирается как в квантовой физике, так и в кулинарии. Удивить дикий баклажан непросто, но возможно: достаточно подарить ему предмет, который он вряд ли когда-либо держал в руках. Например, электроинструмент.')
              );

          },
          function(container, deviceType) {
            if(deviceType == 'desktop') {
              var backgroundUrl = '../polovinki/img/final/clean-bg-man.png';
              var fruitUrl = '../polovinki/img/final/tomatoe.png';
            } else {
              var fruitUrl = '../polovinki/img/final/tomatoe-pad.png'
            }

            if(deviceType == 'tablet' || deviceType == 'pad') {
              var backgroundUrl = '../polovinki/img/final/clean-bg-man-pad.png';
            }
            if(deviceType == 'mobile') {
              var backgroundUrl = '';
              $(container).css({
                'backgroundPosition' : 'right bottom'
              });
            }

            $(container).css({
              'backgroundImage' : 'url(' + backgroundUrl + ')'
            }).append(
              $('<img>').prop({
                'id' : 'final-fruit',
                'src' : fruitUrl,
                'alt' : '',
                'title' : ''
              })
            );

            $(container)
              .find('h3')
              .html('Суровый томат')

            $(container).append(
              $('<p>').html('Ваш любимый – суровый томат. Характер нордический, выдержанный. Любит уединиться в своей пещере, которой служит любимый гараж. Лучший подарок для него – набор для ухода за его «ласточкой», чтобы она всегда блестела и была на ходу. ')
            );
          },
          function(container, deviceType) {
            if(deviceType == 'desktop') {
              var backgroundUrl = '../polovinki/img/final/clean-bg-man.png';
              var fruitUrl = '../polovinki/img/final/qiwi.png';
            } else {
              var fruitUrl = '../polovinki/img/final/qiwi-pad.png'
            }

            if(deviceType == 'tablet' || deviceType == 'pad') {
              var backgroundUrl = '../polovinki/img/final/clean-bg-man-pad.png';
            }
            if(deviceType == 'mobile') {
              var backgroundUrl = '';
              $(container).css({
                'backgroundPosition' : 'right bottom'
              });
            }

            $(container).css({
              'backgroundImage' : 'url(' + backgroundUrl + ')'
            }).append(
              $('<img>').prop({
                'id' : 'final-fruit',
                'src' : fruitUrl,
                'alt' : '',
                'title' : ''
              })
            );

            $(container)
              .find('h3')
              .html('Преданный киви')

            $(container).append(
              $('<p>').html('Ваш любимый – преданный киви. Предмет неиссякаемой радости Вашей мамы и зависти подруг, всегда готовый переключить футбольный матч на Ваш любимый сериал. Лучший способ его отблагодарить – подарить спортивное питание и инвентарь для фитнеса, чтобы любимый был всегда в форме!')
            );
          }
        ],
        items : [
          {
            header : "1.	�так, начнём. Есть ли хобби у вашего избранника?",
            variants : [
              {
                display : "Каждую свободную минуту он посвящает чтению",
                value : 1
              },
              {
                display : "Мы всё делаем вместе. Мои хобби – его хобби",
                value : 3
              },
              {
                display : "Уж не знаю, чем он там в этом своём гараже занимается",
                value : 2
              },
              {
                display : "Что угодно, лишь бы не спать",
                value : 0
              }
            ]
          },
          {
            header : "2. Он любит спорт?",
            variants : [
              {
                display : "У него одна любовь – я!",
                value : 3
              },
              {
                display : "Да, у него первый разряд по шахматам ",
                value : 1
              },
              {
                display : "�ногда мне кажется, что он любит спорт больше, чем меня",
                value : 0
              },
              {
                display : "Футбол по телевизору считается?",
                value : 2
              }
            ]
          },
          {
            header : "3. Какое у него образование?",
            variants : [
              {
                display : "Он профессиональный любитель вечеринок",
                value : 0
              },
              {
                display : "Точно высшее",
                value : 3
              },
              {
                display : "Я потеряла счёт его степеням и званиям",
                value : 1
              },
              {
                display : "Не признаётся",
                value : 2
              }
            ]
          },
          {
            header : "4. Он романтичный?",
            variants : [
              {
                display : "Боюсь, однажды он продаст картины и кров и купит на все деньги целое море цветов",
                value : 3
              },
              {
                display : "Наша единственная прогулка под луной закончилась длинной лекцией об образовании сверхновых",
                value : 1
              },
              {
                display : "«Ну эт… Я тут тебе цветов принёс». Я до сих пор с нежностью вспоминаю наше первое свидание",
                value : 2
              },
              {
                display : "Только когда ему что-нибудь от меня надо",
                value : 0
              }
            ]
          },
          {
            header : "5. Он ухаживает за собой?",
            variants : [
              {
                display : "Он ухаживает за мной!",
                value : 3
              },
              {
                display : "В его арсенале – зубная щётка и средство для душа «7в1»",
                value : 2
              },
              {
                display : "Недавно мы поспорили о пользе улиточной слизи для омоложения кожи",
                value : 0
              },
              {
                display : "Его девиз: «В человеке всё должно быть прекрасно: и лицо, и одежда, и душа, и мысли...» ",
                value : 1
              }
            ]
          },
          {
            header : "6. Какая книга – его любимая?",
            variants : [
              {
                display : "«Сто лет одиночества» ",
                value : 3
              },
              {
                display : "«Справочник автомеханика» ",
                value : 2
              },
              {
                display : "«Логико-философский трактат» ",
                value : 1
              },
              {
                display : "«Великий Гэтсби»",
                value : 0
              }
            ]
          },
          {
            header : "7.	У него есть Instagram?",
            variants : [
              {
                display : "О чём вы? ",
                value : 2
              },
              {
                display : "Есть, но он им не пользуется",
                value : 1
              },
              {
                display : "Есть. Его любимые хэштеги – #оспорттымир и #фотоеды ",
                value : 0
              },
              {
                display : "Есть. Но иногда мне кажется, что это мой аккаунт, судя по количеству моих фотографий",
                value : 3
              }
            ]
          },
          {
            header : "8.	Где вы провели вместе последний отпуск?",
            variants : [
              {
                display : "У его мамы на даче ",
                value : 2
              },
              {
                display : "Ездили на Олимпиаду в � ио ",
                value : 0
              },
              {
                display : "Ездили на родину Вермеера в Нидерланды ",
                value : 1
              },
              {
                display : "В Париже ",
                value : 3
              }
            ]
          }
        ]
      },
      {
        id : 'gender-man',
        questionsBg : {
          desktop : '../polovinki/img/coupon/bg-2.png',
          pad : '../polovinki/img/coupon/bg-2-pad.png',
          mobile : '../polovinki/img/coupon/bg-2-mobile.png'
        },
        addContClass : 'woman',
        subFooterUrl : '../polovinki/img/coupon/subfooter-man.png',
        /**
         * На каждый вариант результата - по функции обработки
         */
        shareDescription : 'Поделитесь результатом теста со своей второй половинкой и друзьями в социальных сетях:',
        contestBanner : 'img/final/contest.png',
        trades : [
          {
            description : 'товары для бани и сауны',
            shareImg : 'http://victoria-group.ru/polovinki/img/share/carrot.jpg',
            shareFbImg : 'http://victoria-group.ru/polovinki/img/share/fb_carrot.jpg',
            id : 'carrot'
          },
          {
            description :  'средства для укладки и аксессуары для волос',
            shareImg : 'http://victoria-group.ru/polovinki/img/share/parsley.jpg',
            shareFbImg : 'http://victoria-group.ru/polovinki/img/share/fb_parsley.jpg',
            id : 'parsley'
          },
          {
            description :  'постельное бельё и полотенца',
            shareImg : 'http://victoria-group.ru/polovinki/img/share/radish_.jpg',
            shareFbImg : 'http://victoria-group.ru/polovinki/img/share/fb_radish.jpg',
            id : 'radish'
          },
          {
            description : 'товары для интерьера, декора, фоторамки, бокалы, фужеры, графины',
            shareFbImg : 'http://victoria-group.ru/polovinki/img/share/fb_corn.jpg',
            shareImg : 'http://victoria-group.ru/polovinki/img/share/corn.jpg',
            id : 'corn'
          }
        ],
        finalScreen : [
          function(container, deviceType) {
            if(deviceType == 'desktop') {
              var backgroundUrl = 'img/final/clean-bg-woman.png';
              var fruitUrl = 'img/final/carrot.png';
            } else {
              var fruitUrl = '../polovinki/img/final/carrot-pad.png'
            }

            if(deviceType == 'tablet' || deviceType == 'pad') {
              var backgroundUrl = '../polovinki/img/final/clean-bg-woman-pad.png';
            }

            if(deviceType == 'mobile') {
              var backgroundUrl = '';
              $(container).css({
                'backgroundPosition' : 'right bottom'
              });
            }

            $(container).css({
              'backgroundImage' : 'url(' + backgroundUrl + ')'
            }).append(
              $('<img>').prop({
                'id' : 'final-fruit',
                'src' : fruitUrl,
                'alt' : '',
                'title' : ''
              })
            );

            $(container)
              .find('h3')
              .html('Ваша вторая половинка – Стройная морковка!')

            $(container).append(
              $('<p>').html('Она очень любит ухаживать за собой. Поддержите её, ведь она старается для вас! Наверняка она будет рада набору роскошной косметики для бани и сауны.')
            );
          },
          function(container, deviceType) {
            if(deviceType == 'desktop') {
              var backgroundUrl = '../polovinki/img/final/clean-bg-woman.png';
              var fruitUrl = '../polovinki/img/final/parsley.png';
            } else {
              var fruitUrl = '../polovinki/img/final/parsley-pad.png';
            }

            if(deviceType == 'tablet' || deviceType == 'pad') {
              var backgroundUrl = '../polovinki/img/final/clean-bg-woman-pad.png';
            }

            if(deviceType == 'mobile') {
              var backgroundUrl = '';
              $(container).css({
                'backgroundPosition' : 'right bottom'
              });
            }

            $(container).css({
              'backgroundImage' : 'url(' + backgroundUrl + ')'
            }).append(
              $('<img>').prop({
                'id' : 'final-fruit',
                'src' : fruitUrl,
                'alt' : '',
                'title' : ''
              })
            );

            $(container)
              .find('h3')
              .html('Ваша любимая – Деловая петрушка!')

            $(container).append(
              $('<p>').html('Спеша на работу, она всё делает на бегу. Порадуйте её набором косметики для волос, чтобы утренние сборы превратились в сплошное удовольствие, и в течение дня её не покидала уверенность в себе. ')
            );
          },
          function(container, deviceType) {
            if(deviceType == 'desktop') {
              var backgroundUrl = '../polovinki/img/final/clean-bg-woman.png';
              var fruitUrl = '../polovinki/img/final/radish.png';
            } else {
              var fruitUrl = '../polovinki/img/final/radish-pad.png'
            }

            if(deviceType == 'tablet' || deviceType == 'pad') {
              var backgroundUrl = '../polovinki/img/final/clean-bg-woman-pad.png';
            }

            if(deviceType == 'mobile') {
              var backgroundUrl = '';
              $(container).css({
                'backgroundPosition' : 'right bottom'
              });
            }

            $(container).css({
              'backgroundImage' : 'url(' + backgroundUrl + ')'
            }).append(
              $('<img>').prop({
                'id' : 'final-fruit',
                'src' : fruitUrl,
                'alt' : '',
                'title' : ''
              })
            );

            $(container)
              .find('h3')
              .html('Ваша вторая половинка – Домашняя редиска!');

            $(container).append(
              $('<p>').html('Она любит заниматься хозяйством, и готовить вкусные ужины. Отблагодарите её – подарите набор красивого постельного белья. Она поймёт, что вы цените её старания и готовы поддерживать семейный очаг. ')
            );
          },
          function(container, deviceType) {
            if(deviceType == 'desktop') {
              var backgroundUrl = '../polovinki/img/final/clean-bg-woman.png';
              var fruitUrl = '../polovinki/img/final/corn.png';
            } else {
              var fruitUrl = '../polovinki/img/final/corn-pad.png'
            }

            if(deviceType == 'tablet' || deviceType == 'pad') {
              var backgroundUrl = '../polovinki/img/final/clean-bg-woman-pad.png';
            }
            if(deviceType == 'mobile') {
              var backgroundUrl = '';
              $(container).css({
                'backgroundPosition' : 'right bottom'
              });
            }

            $(container).css({
              'backgroundImage' : 'url(' + backgroundUrl + ')'
            }).append(
              $('<img>').prop({
                'id' : 'final-fruit',
                'src' : fruitUrl,
                'alt' : '',
                'title' : ''
              })
            );

            $(container)
              .find('h3')
              .html('Ваша дама – � омантичная кукуруза!')

            $(container).append(
              $('<p>').html('Она очень творческая личность, и это замечательно, ведь с ней не соскучишься. Она точно обрадуется вдохновляющему подарку, например, набору для декорирования предметов интерьера, оригинальной фоторамке или красивой посуде.')
            );
          }
        ],
        items : [
          {
            header : "1.	Какая фраза лучше всего описывает ваше типичное семейное утро?",
            variants : [
              {
                display : "Упал, очнулся, гипс",
                value : 1
              },
              {
                display : "Кто ходит в гости по утрам, тот поступает мудро",
                value : 3
              },
              {
                display : "Специально встаю пораньше, чтобы опоздать без спешки ",
                value : 0
              },
              {
                display : "�деальное утро: проснулся, потянулся, повернулся и ... заснул",
                value : 2
              }
            ]
          },
          {
            header : "2.	Какая профессия у вашей избранницы?",
            variants : [
              {
                display : "Женщина должна великолепно выглядеть, остальное - не важно ",
                value : 0
              },
              {
                display : "Ее профессия – жена, поэтому каждый вечер у нас новый потрясающий ужин ",
                value : 2
              },
              {
                display : "Она трудоголик, это считается? ",
                value : 1
              },
              {
                display : "Она – творческая личность во всем!",
                value : 3
              }
            ]
          },
          {
            header : "3.	А как она проводит свободное время?",
            variants : [
              {
                display : "Она знает расписание всех выставок Серова, Айвазовского, различных лекций и мастер-классов ",
                value : 3
              },
              {
                display : "Делает селфи в спортзале ",
                value : 0
              },
              {
                display : "Свободное время? Нет, не слышали... ",
                value : 1
              },
              {
                display : "У нее много хобби: вышивка, рисование на батике, цветы, изучение иностранных языков ",
                value : 2
              }
            ]
          },
          {
            header : "4.	Как вы проводите семейные выходные?",
            variants : [
              {
                display : "Мы с Тамарой ходим парой ",
                value : 2
              },
              {
                display : "Как-как вы сказали? Семейные выходные? ",
                value : 1
              },
              {
                display : "Стоим в очереди в Третьяковку ",
                value : 3
              },
              {
                display : "Муж – в Тверь, жена – в дверь ",
                value : 0
              }
            ]
          },
          {
            header : "5.	А как ваша вторая половинка относится к готовке?",
            variants : [
              {
                display : "Мы питаемся раздельно. Смузи со шпинатом и редькой пробовать не рискую",
                value : 0
              },
              {
                display : "С годами наша любовь переросла в кулинарно-бытовую зависимость ",
                value : 2
              },
              {
                display : "У нас раздельное питание: в одной руке колбаса, в другой – батон",
                value : 1
              },
              {
                display : "Отваривает итальянскую пасту только в изысканной артезианской воде с добавлением мускуса",
                value : 3
              }
            ]
          },
          {
            header : "6.	Как вы делите домашние дела?",
            variants : [
              {
                display : "Я пылесошу, пока любимая наматывает километры на велотренажёре ",
                value : 0
              },
              {
                display : "Странное дело, но дома у нас делать нечего - всегда чисто, уютно и пахнет выпечкой...",
                value : 2
              },
              {
                display : "У нас дома всегда творческий беспорядок ",
                value : 3
              },
              {
                display : "Домашними делами занимаюсь я, пока она на работе ",
                value : 1
              }
            ]
          },
          {
            header : "7.	У вас есть дети?",
            variants : [
              {
                display : "Да, дети – это счастье, даже если от этого счастья дергается левый глаз ",
                value : 0
              },
              {
                display : "Да, очень самостоятельные ",
                value : 1
              },
              {
                display : "Дети – цветы жизни ",
                value : 2
              },
              {
                display : "Мы сами еще дети",
                value : 3
              }
            ]
          },
          {
            header : "8.	Что она подарила вам в прошлом году?",
            variants : [
              {
                display : "Крем для ног, чтобы я не мазал пятки тем её кремом в красивой баночке ",
                value : 0
              },
              {
                display : "� омантический уикенд в Париже… в который не смогла поехать из-за работы ",
                value : 1
              },
              {
                display : "Ваш портрет, вышитый крестиком, и плед с сердечками ",
                value : 3
              },
              {
                display : "Сковороду и набор кастрюль с фразой «Можно иногда их у тебя одалживать?» ",
                value : 2
              }
            ]
          }
        ]
      }
    ]
  });
});
