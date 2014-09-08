angular.module('sawa-patient.directives', [])
    .directive('fullSize', function ($window) {
        return {
            link: function (scope, element, attrs) {
                var windowHeight = $window.innerHeight;
                //windowHeight *= 1.5; // keyboard;
                element[0].style.height = windowHeight + 'px';
            }
        }
    })

    .directive('checkList', function () {
        return {
            scope: {
                list: '=checkList',
                value: '@'
            },
            link: function (scope, elem, attrs) {
                var handler = function (setup) {
                    var checked = elem.prop('checked');
                    var index = scope.list.indexOf(scope.value);

                    if (checked && index == -1) {
                        if (setup) elem.prop('checked', false);
                        else scope.list.push(scope.value);
                    } else if (!checked && index != -1) {
                        if (setup) elem.prop('checked', true);
                        else scope.list.splice(index, 1);
                    }
                };

                var setupHandler = handler.bind(null, true);
                var changeHandler = handler.bind(null, false);

                elem.bind('change', function () {
                    scope.$apply(changeHandler);
                });
                scope.$watch('list', setupHandler, true);
            }
        };
    })

    .directive('resetField', ['$compile', '$timeout', function ($compile, $timeout) {
        return {
            require: 'ngModel',
            scope: {},
            link: function (scope, el, attrs, ctrl) {

                // limit to input element of specific types
                var inputTypes = /text|search|tel|url|email|password/i;
                if (el[0].nodeName === "INPUT") {
                    if (!inputTypes.test(attrs.type)) {
                        throw new Error("Invalid input type for resetField: " + attrs.type);
                    }
                } else if (el[0].nodeName !== "TEXTAREA") {
                    throw new Error("resetField is limited to input and textarea elements");
                }

                // compiled reset icon template
                var template = $compile('<i ng-show="enabled" ng-click="reset()" class="icon ion-close reset-field-icon"></i>')(scope);
                el.addClass("reset-field");
                el.after(template);

                scope.reset = function () {
                    ctrl.$setViewValue(null);
                    ctrl.$render();
                    $timeout(function () {
                        el[0].focus();
                    }, 0, false);
                    scope.enabled = false;
                };

                el.bind('input', function () {
                    scope.enabled = !ctrl.$isEmpty(el.val());
                })
                    .bind('focus', function () {
                        $timeout(function () { //Timeout just in case someone else is listening to focus and alters model
                            scope.enabled = !ctrl.$isEmpty(el.val());
                            scope.$apply();
                        }, 0, false);
                    })
                    .bind('blur', function () {
                        $timeout(function () {
                            scope.enabled = false;
                            scope.$apply();
                        }, 0, false);
                    });
            }
        };
    }])

;