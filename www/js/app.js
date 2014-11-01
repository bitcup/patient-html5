var config_data = {
    'CONFIGS': {
        'APP_NAME': 'Sawa for Patients',
        'APP_VERSION': '0.1',
        'LOCAL_STORAGE_EMAIL_KEY': 'sawaPatientEmail',
        'LOCAL_STORAGE_PASS_KEY': 'sawaPatientPass',
        'COUCH_LOCAL_DB_NAME': 'sawaPatientDb',
        'COUCH_LOCAL_DB_DESTROY': false,
        'DEBUG_MODE': true
    }
};

var sawaPatientModule = angular.module('sawa-patient', ['ionic', 'sawa-patient.controllers',
    'sawa-patient.services', 'sawa-patient.filters', 'sawa-patient.directives'])

    .run(function ($ionicPlatform) {
        $ionicPlatform.ready(function () {
            // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
            // for form inputs)
            if (window.cordova && window.cordova.plugins.Keyboard) {
                cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
            }
            if (window.StatusBar) {
                // org.apache.cordova.statusbar required
                StatusBar.styleDefault();
            }
        });
    })

    .config(function ($stateProvider, $urlRouterProvider) {

        // Ionic uses AngularUI Router which uses the concept of states
        // Learn more here: https://github.com/angular-ui/ui-router
        // Set up the various states which the app can be in.
        // Each state's controller can be found in controllers.js
        $stateProvider

            .state('login', {
                url: "/login",
                templateUrl: "templates/login.html",
                controller: 'LoginCtrl'
            })

            // -------------------------------------------------
            // parent abstract state - used to:
            // 1) prepend '/tab' to all other urls
            // 2) insert the tabs.html template whose '<ion-nav-view>' is populated by child states
            // -------------------------------------------------
            .state('tab', {
                url: "/tab",
                abstract: true,
                templateUrl: "templates/menu.html",
                controller: 'MenuCtrl'
            })

            .state('tab.debug', {
                url: "/debug",
                views: {
                    'menuContent': {
                        templateUrl: 'templates/debug.html',
                        controller: 'DebugCtrl'
                    }
                }
            })

            // -------------------------------------------------
            // all these tabs have same history stack: tab-cares
            // -------------------------------------------------
            .state('tab.cares', {
                url: '/cares',
                views: {
                    'menuContent': {
                        templateUrl: 'templates/tab-cares.html',
                        controller: 'CaresCtrl'
                    }
                }
            })

            .state('tab.care-details', {
                url: '/care-details/:id',
                views: {
                    'menuContent': {
                        templateUrl: 'templates/tab-care-details.html',
                        controller: 'CareDetailsCtrl'
                    }
                }
            })

            // -------------------------------------------------
            // all these tabs have same history stack: tab-practitioners
            // -------------------------------------------------
            .state('tab.practitioners', {
                url: '/practitioners?cId',
                views: {
                    'menuContent': {
                        templateUrl: 'templates/tab-practitioners.html',
                        controller: 'PractitionersCtrl'
                    }
                }
            })

            .state('tab.practitioner-details', {
                url: '/practitioner-details/:id',
                views: {
                    'menuContent': {
                        templateUrl: 'templates/tab-practitioner-details.html',
                        controller: 'PractitionerDetailsCtrl'
                    }
                }
            })

            // -------------------------------------------------
            // all these tabs have same history stack: tab-notes
            // -------------------------------------------------
            .state('tab.notes', {
                url: '/notes?pId&cId',
                views: {
                    'menuContent': {
                        templateUrl: 'templates/tab-notes.html',
                        controller: 'NotesCtrl'
                    }
                }
            })

            .state('tab.note-details', {
                url: '/note-details/:id',
                views: {
                    'menuContent': {
                        templateUrl: 'templates/tab-note-details.html',
                        controller: 'NoteDetailsCtrl'
                    }
                }
            })

            // -------------------------------------------------
            // all these tabs have same history stack: tab-account
            // -------------------------------------------------
            .state('tab.account', {
                url: '/account',
                views: {
                    'menuContent': {
                        templateUrl: 'templates/tab-account.html',
                        controller: 'AccountCtrl'
                    }
                }
            });

        // if none of the above states are matched, use this as the fallback
        $urlRouterProvider.otherwise('/tab/cares');

    });

angular.forEach(config_data, function (key, value) {
    sawaPatientModule.constant(value, key);
});

