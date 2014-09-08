angular.module('sawa-patient.controllers', [])

    /* ---------------------------------------------------------------------------------- */
    /*  Cares */
    /* ---------------------------------------------------------------------------------- */
    .controller('CaresCtrl', function ($scope, $state, $log, $timeout, CareSvc, CredentialsHolder, ModalSvc) {
        if (!CredentialsHolder.isLoggedIn()) {
            $state.go('login');
        }
        // get cares data
        $scope.initView = function () {
            CareSvc.queryAllCare().then(function (res) {
                $scope.cares = res;
            });
            $scope.care = {};
        };
        $scope.initView();

        // create care
        ModalSvc.setupModal('care', $scope, $log);
        $scope.openCareModal = function () {
            $scope.careModal.show();
        };
        $scope.closeCareModal = function () {
            $scope.careModal.hide();
            $scope.care = {};
        };
        $scope.saveCare = function () {
            CareSvc.saveCare($scope.care).then(
                function (saved) {
                    $scope.closeCareModal();
                    $state.go('tab.care-details', {id: saved.id});
                    //$scope.initView();
                },
                function () {
                    ModalSvc.alert('Could not save.  Please try again later.');
                });
        };

        // pull to show search
        $scope.doRefresh = function() {
            $timeout( function() {
                $scope.showSearch = true;
                $scope.$broadcast('scroll.refreshComplete');
            }, 1);
        };

        // destroy modals
        $scope.$on('$destroy', function () {
            $log.debug('removing modal upon destruction of view');
            $scope.careModal.remove();
        });

    })

    /* ---------------------------------------------------------------------------------- */
    /*  Care Details */
    /* ---------------------------------------------------------------------------------- */
    .controller('CareDetailsCtrl', function ($scope, $state, $stateParams, $ionicPopup, $ionicActionSheet,
                                             $log, CareSvc, CredentialsHolder, PractitionerSvc, NoteSvc, ModalSvc, EmailSvc) {
        if (!CredentialsHolder.isLoggedIn()) {
            $state.go('login');
        }

        $scope.initView = function () {
            CareSvc.queryOneCare($stateParams.id).then(function (care) {
                $scope.care = care;
                NoteSvc.queryAllForCare(care, true).then(function (notes) {
                    $scope.numNotes = notes.length;
                });
                PractitionerSvc.queryForCare(care, true).then(function (practitioners) {
                    $scope.numPractitioners = practitioners.length;
                });
            });
            $scope.share = {};
            $scope.note = {};
            $scope.practitioner = {};
        };
        $scope.initView();

        $scope.$watch('care.overnight', function (newVal, oldVal) {
            if (newVal == false) {
                $log.info('setting care.overnight to false ==> care.end is null');
                $scope.care.end = null;
            }
        }, true);

        // update care
        ModalSvc.setupModal('care', $scope, $log);
        $scope.closeCareModal = function () {
            $scope.careModal.hide();
        };
        $scope.saveCare = function () {
            $log.debug('updating current care: ' + JSON.stringify($scope.care));
            CareSvc.saveCare($scope.care).then(
                function () {
                    $scope.closeCareModal();
                    $scope.initView();
                },
                function () {
                    ModalSvc.alert('Could not save.  Please try again later.');
                });
        };

        // create new note for care
        ModalSvc.setupModal('note', $scope, $log);
        $scope.closeNoteModal = function () {
            $scope.noteModal.hide();
        };
        $scope.saveNote = function () {
            NoteSvc.createNoteForCare($scope.note, $scope.care._id).then(
                function (saved) {
                    $scope.closeNoteModal();
                    $scope.initView();
                },
                function () {
                    ModalSvc.alert('Could not save.  Please try again later.');
                });
        };

        // create new practitioner for care
        ModalSvc.setupModal('practitioner', $scope, $log);
        $scope.closePractitionerModal = function () {
            $scope.practitionerModal.hide();
        };
        $scope.savePractitioner = function () {
            PractitionerSvc.createPractitionerForCare($scope.practitioner, $scope.care._id).then(
                function (saved) {
                    $scope.closePractitionerModal();
                    $scope.initView();
                },
                function () {
                    ModalSvc.alert('Could not save.  Please try again later.');
                });
        };

        $scope.showActionSheet = function () {
            $ionicActionSheet.show({
                //titleText: ' ',
                buttons: [
                    { text: 'Edit' },
                    { text: 'Add Practitioner' },
                    { text: 'Add Note' },
                    { text: 'Share' }
                ],
                destructiveText: 'Delete',
                cancelText: 'Cancel',
                cancel: function () {
                    $log.debug('CANCELLED');
                },
                buttonClicked: function (index) {
                    $log.debug('BUTTON CLICKED: ' + index);
                    if (index == 0) {
                        $scope.careModal.show();
                    }
                    if (index == 1) {
                        $scope.practitioner.careId = true;
                        $scope.practitionerModal.show();
                    }
                    if (index == 2) {
                        $scope.note.careId = true;
                        $scope.noteModal.show();
                    }
                    if (index == 3) {
                        PractitionerSvc.queryAllPractitioners(false).then(function (practitioners) {
                            $scope.sharePractitioners = [];
                            for (var p in practitioners) {
                                if (practitioners[p].email) {
                                    $scope.sharePractitioners.push(practitioners[p]);
                                }
                            }
                            $scope.checkedPractitioners = [];
                        });
                        $scope.shareModal.show();
                    }
                    return true;
                },
                destructiveButtonClicked: function () {
                    $log.info('DESTRUCT');
                    $ionicPopup.confirm({
                        title: 'Delete Care',
                        content: '<div style="text-align: center;">Are you sure you want to delete "' +
                            $scope.care.facilityName + '" and all its associated data?</div>'
                    }).then(function (res) {
                        if (res) {
                            CareSvc.deleteCare($scope.care._id, $scope.care._rev).then(
                                function () {
                                    $state.go('tab.cares');
                                },
                                function () {
                                    ModalSvc.alert('Could not delete.  Please try again later.');
                                });
                        }
                    });
                    return true;
                }
            });
        };

        ModalSvc.setupModal('share', $scope, $log);
        $scope.closeShareModal = function () {
            $scope.shareModal.hide();
        };
        $scope.doShare = function () {
            var emails = [];
            for (var i=0; i<$scope.checkedPractitioners.length; i++) {
                emails.push(JSON.parse($scope.checkedPractitioners[i]).email);
            }
            $log.debug('recipients: ' + JSON.stringify(emails));
            EmailSvc.shareCare($scope.care, emails);
        };

        // destroy modals
        $scope.$on('$destroy', function () {
            $log.debug('removing modal upon destruction of view');
            $scope.careModal.remove();
            $scope.practitionerModal.remove();
            $scope.noteModal.remove();
            $scope.shareModal.remove();
        });

    })

    /* ---------------------------------------------------------------------------------- */
    /*  Practitioners */
    /* ---------------------------------------------------------------------------------- */
    .controller('PractitionersCtrl', function ($scope, $state, $stateParams, $timeout, PractitionerSvc, CareSvc,
                                               CredentialsHolder, ModalSvc, $log) {
        if (!CredentialsHolder.isLoggedIn()) {
            $state.go('login');
        }
        // get practitioners
        $scope.initView = function () {
            // if in the context of a care, then lookup care based on the url cId
            // so we can use it to filter the practitioners by it
            if ($stateParams && $stateParams.cId) {
                $log.info('finding practitioners for care id: ' + $stateParams.cId);
                CareSvc.queryOneCare($stateParams.cId).then(function (care) {
                    $scope.care = care;
                    PractitionerSvc.queryForCare($scope.care, true).then(function (practitioners) {
                        $scope.practitioners = practitioners;
                    });
                });
            }
            else {
                $log.info('finding all practitioners');
                PractitionerSvc.queryAllPractitioners(true).then(function (practitioners) {
                    $scope.practitioners = practitioners;
                });
            }
            // used in modal to create new practitioner
            $scope.practitioner = {};
        };
        $scope.initView();

        // create practitioner
        ModalSvc.setupModal('practitioner', $scope, $log);
        $scope.openPractitionerModal = function () {
            if ($scope.care) {
                $scope.practitioner.careId = true;
            }
            $scope.practitionerModal.show();
        };
        $scope.closePractitionerModal = function () {
            $scope.practitionerModal.hide();
            $scope.practitioner = {};
        };
        $scope.savePractitioner = function () {
            var assignToCare = false;
            if ($scope.practitioner.careId) {
                assignToCare = true;
                $scope.practitioner.careId = null;
            }
            PractitionerSvc.createPractitionerForCare($scope.practitioner, (assignToCare ? $scope.care._id : null)).then(
                function (saved) {
                    $scope.closePractitionerModal();
                    //$scope.initView();
                    $state.go('tab.practitioner-details', {id: saved.id});
                },
                function () {
                    ModalSvc.alert('Could not save.  Please try again later.');
                });
        };

        // pull to show search
        $scope.doRefresh = function() {
            $timeout( function() {
                $scope.showSearch = true;
                $scope.$broadcast('scroll.refreshComplete');
            }, 1);
        };

        // destroy modals upon destroying this view
        $scope.$on('$destroy', function () {
            $log.debug('removing modals upon destruction of view');
            $scope.practitionerModal.remove();
        });

    })

    /* ---------------------------------------------------------------------------------- */
    /*  Practitioner Details */
    /* ---------------------------------------------------------------------------------- */
    .controller('PractitionerDetailsCtrl', function ($scope, $state, $stateParams, $ionicPopup, $ionicActionSheet,
                                                     $log, CareSvc, NoteSvc, CredentialsHolder, PractitionerSvc, EmailSvc, ModalSvc) {
        if (!CredentialsHolder.isLoggedIn()) {
            $state.go('login');
        }
        // get practitioner with parent
        $scope.initView = function () {
            PractitionerSvc.queryOne($stateParams.id, true).then(function (practitioner) {
                $scope.practitioner = practitioner;
                // child is used to populate modal-careList.html with a generic child that can be assigned to a care
                $scope.child = practitioner;
                NoteSvc.queryAllForPractitioner(practitioner, true).then(function (notes) {
                    $scope.numNotes = notes.length;
                });
            });
            $scope.share = {};
            $scope.note = {};
        };
        $scope.initView();

        /*
        $scope.$watch('practitioner.visit', function (newVal, oldVal) {
            if (newVal == false) {
                $log.info('setting practitioner.visit to false ==> reset visitDate and officeLocation');
                $scope.practitioner.visitDate = null;
                $scope.practitioner.officeLocation = null;
            }
        }, true);
        */

        // update practitioner
        ModalSvc.setupModal('practitioner', $scope, $log);
        $scope.closePractitionerModal = function () {
            $scope.practitionerModal.hide();
        };
        $scope.savePractitioner = function () {
            PractitionerSvc.createPractitionerForCare($scope.practitioner, $scope.practitioner.careId).then(
                // success
                function () {
                    $scope.closePractitionerModal();
                    $scope.initView();
                },
                function () {
                    ModalSvc.alert('Could not save.  Please try again later.');
                });
        };

        $scope.showActionSheet = function () {
            $ionicActionSheet.show({
                //titleText: ' ',
                buttons: [
                    { text: 'Edit' },
                    { text: 'Assign to Care' },
                    { text: 'Add Note' },
                    { text: 'Share' }
                ],
                destructiveText: 'Delete',
                cancelText: 'Cancel',
                cancel: function () {
                    $log.debug('CANCELLED');
                },
                buttonClicked: function (index) {
                    $log.debug('BUTTON CLICKED: ' + index);
                    if (index == 0) {
                        $scope.practitionerModal.show();
                    }
                    if (index == 1) {
                        $scope.openCareListModal();
                    }
                    if (index == 2) {
                        $scope.note.practitionerId = true;
                        $scope.noteModal.show();
                    }
                    if (index == 3) {
                        PractitionerSvc.queryAllPractitioners(false).then(function (practitioners) {
                            $scope.sharePractitioners = [];
                            for (var p in practitioners) {
                                if (practitioners[p].email) {
                                    $scope.sharePractitioners.push(practitioners[p]);
                                }
                            }
                            $scope.checkedPractitioners = [];
                        });
                        $scope.shareModal.show();
                    }
                    return true;
                },
                destructiveButtonClicked: function () {
                    $log.info('DESTRUCT');
                    $ionicPopup.confirm({
                        title: 'Delete Practitioner',
                        content: '<div style="text-align: center;">Are you sure you want to delete practitioner "' +
                            $scope.practitioner.name + '" and all their associated data?</div>'
                    }).then(function (res) {
                        if (res) {
                            PractitionerSvc.deleteOne($scope.practitioner._id, $scope.practitioner._rev).then(
                                function () {
                                    $state.go('tab.practitioners');
                                },
                                // error
                                function () {
                                    ModalSvc.alert('Could not delete.  Please try again later.');
                                });
                        }
                    });
                    return true;
                }
            });
        };

        // assign to care
        ModalSvc.setupModal('careList', $scope, $log);
        $scope.openCareListModal = function () {
            CareSvc.queryAllCare().then(function (res) {
                $scope.cares = res;
            });
            $scope.careListModal.show();
        };
        $scope.closeCareListModal = function () {
            $scope.careListModal.hide();
        };
        $scope.assignCare = function () {
            $scope.practitioner.careId = $scope.child.careId;
            for (var c in $scope.cares) {
                if ($scope.cares[c]._id === $scope.practitioner.careId) {
                    $log.debug('assigned to care: ' + JSON.stringify($scope.cares[c]));
                }
            }
            $scope.savePractitioner();
            $scope.closeCareListModal();
        };
        $scope.unAssign = function () {
            $scope.child.careId = null;
            $scope.practitioner.careId = null;
        };

        // create new note for practitioner
        ModalSvc.setupModal('note', $scope, $log);
        $scope.closeNoteModal = function () {
            $scope.noteModal.hide();
        };
        $scope.saveNote = function () {
            NoteSvc.createNoteForPractitioner($scope.note, $scope.practitioner._id).then(
                function (saved) {
                    $scope.closeNoteModal();
                    $scope.initView();
                },
                function () {
                    ModalSvc.alert('Could not save.  Please try again later.');
                });
        };

        // share
        ModalSvc.setupModal('share', $scope, $log);
        $scope.closeShareModal = function () {
            $scope.shareModal.hide();
        };
        $scope.doShare = function () {
            var emails = [];
            for (var i=0; i<$scope.checkedPractitioners.length; i++) {
                emails.push(JSON.parse($scope.checkedPractitioners[i]).email);
            }
            $log.debug('recipients: ' + JSON.stringify(emails));
            EmailSvc.sharePractitioner($scope.practitioner, emails);
        };

        // destroy modals upon destroying this view
        $scope.$on('$destroy', function () {
            $log.debug('removing modals upon destruction of view');
            $scope.careListModal.remove();
            $scope.practitionerModal.remove();
            $scope.noteModal.remove();
            $scope.shareModal.remove();
        });

    })

    /* ---------------------------------------------------------------------------------- */
    /*  Notes */
    /* ---------------------------------------------------------------------------------- */
    .controller('NotesCtrl', function ($scope, $state, $stateParams, $timeout,
                                       CareSvc, PractitionerSvc, NoteSvc, CredentialsHolder, ModalSvc, $log) {
        if (!CredentialsHolder.isLoggedIn()) {
            $state.go('login');
        }
        // get notes (with parent) data
        $scope.initView = function () {
            if ($stateParams && $stateParams.cId) {
                $log.info('finding notes for care id: ' + $stateParams.cId);
                CareSvc.queryOneCare($stateParams.cId).then(function (care) {
                    $scope.care = care;
                    NoteSvc.queryAllForCare($scope.care, true).then(function (notes) {
                        $scope.notes = notes;
                    });
                });
            } else if ($stateParams && $stateParams.pId) {
                $log.info('finding notes for practitioner id: ' + $stateParams.pId);
                PractitionerSvc.queryOne($stateParams.pId).then(function(practitioner) {
                    $scope.practitioner = practitioner;
                    NoteSvc.queryAllForPractitioner(practitioner, true).then(function (notes) {
                        $scope.notes = notes;
                    });
                });
            } else {
                $log.info('finding all notes');
                NoteSvc.queryAllNotes(true).then(function (res) {
                    $scope.notes = res;
                });
            }
            // used in modal
            $scope.note = {};
        };
        $scope.initView();

        // create new note
        ModalSvc.setupModal('note', $scope, $log);
        $scope.openNoteModal = function () {
            if ($scope.care) {
                $scope.note.careId = true;
            }
            if ($scope.practitioner) {
                $scope.note.practitionerId = true;
            }
            $scope.noteModal.show();
        };
        $scope.closeNoteModal = function () {
            $scope.noteModal.hide();
            $scope.note = {};
        };
        $scope.saveNote = function () {
            if ($scope.note.careId) {
                $scope.note.careId = null;
                NoteSvc.createNoteForCare($scope.note, $scope.care._id).then(
                    function (saved) {
                        $scope.closeNoteModal();
                        $state.go('tab.note-details', {id: saved.id});
                        //$scope.initView();
                    },
                    function () {
                        ModalSvc.alert('Could not save.  Please try again later.');
                    });
            } else if ($scope.note.practitionerId) {
                $scope.note.practitionerId = null;
                NoteSvc.createNoteForPractitioner($scope.note, $scope.practitioner._id).then(
                    function (saved) {
                        $scope.closeNoteModal();
                        $state.go('tab.note-details', {id: saved.id});
                        //$scope.initView();
                    },
                    function () {
                        ModalSvc.alert('Could not save.  Please try again later.');
                    });
            } else {
                NoteSvc.createNoteForCare($scope.note, null).then(
                    function (saved) {
                        $scope.closeNoteModal();
                        $state.go('tab.note-details', {id: saved.id});
                        //$scope.initView();
                    },
                    function () {
                        ModalSvc.alert('Could not save.  Please try again later.');
                    });
            }
        };

        // pull to show search
        $scope.doRefresh = function() {
            $timeout( function() {
                $scope.showSearch = true;
                $scope.$broadcast('scroll.refreshComplete');
            }, 1);
        };

        // destroy modals upon destroying this view
        $scope.$on('$destroy', function () {
            $log.debug('removing modals upon destruction of view');
            $scope.noteModal.remove();
        });

    })

    /* ---------------------------------------------------------------------------------- */
    /*  Note Details */
    /* ---------------------------------------------------------------------------------- */
    .controller('NoteDetailsCtrl', function ($scope, $state, $stateParams, $ionicPopup, $ionicActionSheet, $log, NoteSvc, CredentialsHolder, PractitionerSvc, CareSvc, EmailSvc, ModalSvc) {
        if (!CredentialsHolder.isLoggedIn()) {
            $state.go('login');
        }
        // get note with parent
        $scope.initView = function () {
            NoteSvc.queryOne($stateParams.id, true).then(function (note) {
                $scope.note = note;
                // child is used to populate modal-careList.html with a generic child that can be assigned to a care
                $scope.child = note;
            });
            $scope.share = {};
        };
        $scope.initView();

        // update note
        ModalSvc.setupModal('note', $scope, $log);
        $scope.closeNoteModal = function () {
            $scope.noteModal.hide();
        };
        $scope.saveNote = function () {
            NoteSvc.createNoteForPractitioner($scope.note, $scope.note.practitionerId).then(
                function () {
                    $scope.closeNoteModal();
                    $scope.initView();
                },
                function () {
                    ModalSvc.alert('Could not save.  Please try again later.');
                });
        };

        $scope.showActionSheet = function () {
            var optionsArr = [];
            optionsArr.push({ text: 'Edit' });
            if (!$scope.note.practitioner) {
                optionsArr.push({ text: 'Assign to Care' });
            }
            if (!$scope.note.care) {
                optionsArr.push({ text: 'Assign to Practitioner' });
            }
            optionsArr.push({ text: 'Share' });
            $ionicActionSheet.show({
                //titleText: ' ',
                buttons: optionsArr,
                destructiveText: 'Delete',
                cancelText: 'Cancel',
                cancel: function () {
                    $log.debug('CANCELLED');
                },
                buttonClicked: function (index) {
                    $log.debug('BUTTON CLICKED: ' + index);
                    if (index == 0) {
                        $scope.noteModal.show();
                    }
                    if ((optionsArr.length == 4 && index == 1) || (optionsArr.length == 3 && !$scope.note.practitioner && index == 1)) {
                        $scope.openCareListModal();
                    }
                    if ((optionsArr.length == 4 && index == 2) || (optionsArr.length == 3 && !$scope.note.care && index == 1)) {
                        $scope.openPractitionerListModal();
                    }
                    if ((optionsArr.length == 4 && index == 3) ||
                        (optionsArr.length == 3 && !$scope.note.practitioner && index == 2) ||
                        (optionsArr.length == 3 && !$scope.note.care && index == 2)) {
                        PractitionerSvc.queryAllPractitioners(false).then(function (practitioners) {
                            $scope.sharePractitioners = [];
                            for (var p in practitioners) {
                                if (practitioners[p].email) {
                                    $scope.sharePractitioners.push(practitioners[p]);
                                }
                            }
                            $scope.checkedPractitioners = [];
                        });
                        $scope.shareModal.show();
                    }
                    return true;
                },
                destructiveButtonClicked: function () {
                    $log.info('DESTRUCT');
                    $ionicPopup.confirm({
                        title: 'Delete Note',
                        content: '<div style="text-align: center;">Are you sure you want to delete note?</div>'
                    }).then(function (res) {
                        if (res) {
                            NoteSvc.deleteOne($scope.note._id, $scope.note._rev).then(
                                function () {
                                    $state.go('tab.notes');
                                },
                                function () {
                                    ModalSvc.alert('Could not delete.  Please try again later.');
                                });
                        }
                    });
                    return true;
                }
            });
        };

        // assign to practitioner
        ModalSvc.setupModal('practitionerList', $scope, $log);
        $scope.openPractitionerListModal = function () {
            PractitionerSvc.queryAllPractitioners(true).then(function (res) {
                $scope.practitioners = res;
            });
            $scope.practitionerListModal.show();
        };
        $scope.closePractitionerListModal = function () {
            $scope.practitionerListModal.hide();
        };
        $scope.assignPractitioner = function () {
            for (var p in $scope.practitioners) {
                if ($scope.practitioners[p]._id === $scope.note.practitionerId) {
                    $log.debug('assigned to practitioner: ' + JSON.stringify($scope.practitioners[p]));
                }
            }
            $scope.saveNote();
            $scope.closePractitionerListModal();
        };
        $scope.unAssign = function () {
            $scope.note.practitionerId = null;
        };

        // assign to care
        ModalSvc.setupModal('careList', $scope, $log);
        $scope.openCareListModal = function () {
            CareSvc.queryAllCare().then(function (res) {
                $scope.cares = res;
            });
            $scope.careListModal.show();
        };
        $scope.closeCareListModal = function () {
            $scope.careListModal.hide();
        };
        $scope.assignCare = function () {
            $scope.note.careId = $scope.child.careId;
            for (var c in $scope.cares) {
                if ($scope.cares[c]._id === $scope.note.careId) {
                    $log.debug('assigned to care: ' + JSON.stringify($scope.cares[c]));
                }
            }
            $scope.saveNote();
            $scope.closeCareListModal();
        };
        $scope.unAssign = function () {
            $scope.note.careId = null;
            $scope.child.careId = null;
        };

        // share
        ModalSvc.setupModal('share', $scope, $log);
        $scope.closeShareModal = function () {
            $scope.shareModal.hide();
        };
        $scope.doShare = function () {
            var emails = [];
            for (var i=0; i<$scope.checkedPractitioners.length; i++) {
                emails.push(JSON.parse($scope.checkedPractitioners[i]).email);
            }
            $log.debug('recipients: ' + JSON.stringify(emails));
            EmailSvc.shareNote($scope.note, emails);
        };

        // destroy modals upon destroying this view
        $scope.$on('$destroy', function () {
            $log.debug('removing modals upon destruction of view');
            $scope.noteModal.remove();
            $scope.practitionerListModal.remove();
            $scope.careListModal.remove();
            $scope.shareModal.remove();
        });

    })

    /* ---------------------------------------------------------------------------------- */
    /*  Debug */
    /* ---------------------------------------------------------------------------------- */
    .controller('DebugCtrl', function ($scope, $state, ppDebugSvc) {
        ppDebugSvc.queryAll().then(function (res) {
            $scope.docs = res;
        });
        ppDebugSvc.dbInfo().then(function (res) {
            $scope.info = res;
        });
        ppDebugSvc.careStats().then(function (res) {
            $scope.careStats = res;
        });
        ppDebugSvc.practitionerStats().then(function (res) {
            $scope.practitionerStats = res;
        });
        ppDebugSvc.noteStats().then(function (res) {
            $scope.noteStats = res;
        });
        $scope.deleteAllData = function() {
            ppDebugSvc.deleteAllData();
        };
    })

    /* ---------------------------------------------------------------------------------- */
    /*  Account */
    /* ---------------------------------------------------------------------------------- */
    .controller('AccountCtrl', function ($scope, $state, CredentialsHolder, AuthenticationService) {
        if (!CredentialsHolder.isLoggedIn()) {
            $state.go('login');
        }
        $scope.signOut = function () {
            AuthenticationService.logout();
        };
        $scope.loggedInUserEmail = CredentialsHolder.getCredentials().email;
    })

    /* ---------------------------------------------------------------------------------- */
    /*  Login */
    /* ---------------------------------------------------------------------------------- */
    .controller('LoginCtrl', function ($scope, AuthenticationService) {
        $scope.user = {
            email: null,
            password: null
        };

        $scope.logIn = function () {
            if (!$scope.user.email || !$scope.user.password) {
                return;
            }
            AuthenticationService.login($scope.user);
        };
    })

    /* ---------------------------------------------------------------------------------- */
    /*  Menu */
    /* ---------------------------------------------------------------------------------- */
    .controller('MenuCtrl', function ($scope, CONFIGS) {
        $scope.showDebug = CONFIGS.DEBUG_MODE;
    })

;
