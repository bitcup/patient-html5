angular.module('sawa-patient.services', [])

    .factory('pouchDb', ['$log', 'CONFIGS', function ($log, CONFIGS) {
        var factory = {};
        factory.getInstance = function () {
            if (CONFIGS.COUCH_LOCAL_DB_DESTROY) {
                factory.destroy();
            }
            return new PouchDB(CONFIGS.COUCH_LOCAL_DB_NAME, {adapter: 'websql'});
        };
        factory.destroy = function () {
            PouchDB.destroy(CONFIGS.COUCH_LOCAL_DB_NAME, function (err, info) {
                $log.warn('----------- DESTROYED pouchDb instance --------------');
            });
        };
        return factory;
    }])

    .factory('pouchDAO', function ($q, pouchDb, $rootScope, $log) {
        return {
            findView: function (mrFunction, isDescending) {
                var options = {include_docs: true, descending: isDescending};
                var deferred = $q.defer();
                pouchDb.getInstance().query(mrFunction, options, function (err, res) {
                    $rootScope.$apply(function () {
                        if (err) {
                            deferred.reject(err);
                        } else {
                            if (!res.rows.length) {
                                deferred.resolve(0);
                            } else {
                                // get rid of '.doc' intermediate object
                                var myData = [];
                                for (var r in res.rows) {
                                    myData[r] = res.rows[r].doc;
                                }
                                deferred.resolve(myData);
                            }
                        }
                    });
                });
                return deferred.promise;
            },
            findViewWithParent: function (mrFunction, isDescending) {
                var options = {include_docs: true, descending: isDescending};
                var deferred = $q.defer();
                pouchDb.getInstance().query(mrFunction, options, function (err, res) {
                    // find parent
                    var hasParent = false;
                    var myData = [];
                    if (res.rows.length) {
                        for (var i = 0; i < res.rows.length; i++) {
                            // just the 'doc' part
                            myData[i] = res.rows[i].doc;
                            // for practitioners/notes assigned to a care
                            if (myData[i].careId) {
                                hasParent = true;
                                pouchDb.getInstance().get(myData[i].careId, function (err2, res2) {
                                    if (res2) {
                                        for (var md in myData) {
                                            if (myData[md].careId === res2._id) {
                                                myData[md].care = res2;
                                            }
                                        }
                                    }
                                    $rootScope.$apply(function () {
                                        if (err) {
                                            deferred.reject(err);
                                        } else if (err2) {
                                            deferred.reject(err2);
                                        } else {
                                            if (!myData.length) {
                                                deferred.resolve(0);
                                            } else {
                                                deferred.resolve(myData);
                                            }
                                        }
                                    });
                                });
                            }
                            // for notes assigned to a practitioner
                            if (myData[i].practitionerId) {
                                hasParent = true;
                                pouchDb.getInstance().get(myData[i].practitionerId, function (err2, res2) {
                                    if (res2) {
                                        for (var md in myData) {
                                            if (myData[md].practitionerId === res2._id) {
                                                myData[md].practitioner = res2;
                                            }
                                        }
                                    }
                                    $rootScope.$apply(function () {
                                        if (err) {
                                            deferred.reject(err);
                                        } else if (err2) {
                                            deferred.reject(err2);
                                        } else {
                                            if (!myData.length) {
                                                deferred.resolve(0);
                                            } else {
                                                deferred.resolve(myData);
                                            }
                                        }
                                    });
                                });
                            }
                        }
                    }
                    if (!hasParent) {
                        $log.debug('no parent');
                        if (err) {
                            deferred.reject(err);
                        } else {
                            if (!res.rows.length) {
                                deferred.resolve(0);
                            } else {
                                // get rid of '.doc' intermediate object
                                var myData = [];
                                for (var r in res.rows) {
                                    myData[r] = res.rows[r].doc;
                                }
                                deferred.resolve(myData);
                            }
                        }
                    }
                });
                return deferred.promise;
            },
            saveDoc: function (doc) {
                if (doc.care) {
                    delete doc.care;
                }
                if (doc.practitioner) {
                    delete doc.practitioner;
                }
                var deferred = $q.defer();
                pouchDb.getInstance().post(doc, function (err, res) {
                    $rootScope.$apply(function () {
                        if (err) {
                            deferred.reject(err);
                        } else {
                            deferred.resolve(res);
                        }
                    });
                });
                return deferred.promise;
            },
            getDocById: function (id) {
                var deferred = $q.defer();
                pouchDb.getInstance().get(id, function (err, res) {
                    $rootScope.$apply(function () {
                        if (err) {
                            deferred.reject(err);
                        } else {
                            deferred.resolve(res);
                        }
                    });
                });
                return deferred.promise;
            },
            getDocByIdWithParent: function (id) {
                var deferred = $q.defer();
                pouchDb.getInstance().get(id, function (err, res) {
                    // find parent
                    var hasParent = false;
                    var myData = {};
                    if (res) {
                        myData = res;
                        if (myData.careId) {
                            hasParent = true;
                            pouchDb.getInstance().get(myData.careId, function (err2, res2) {
                                myData.care = res2;
                                $rootScope.$apply(function () {
                                    if (err) {
                                        deferred.reject(err);
                                    } else if (err2) {
                                        deferred.reject(err2);
                                    } else {
                                        deferred.resolve(myData);
                                    }
                                });
                            });
                        } else if (myData.practitionerId) {
                            hasParent = true;
                            pouchDb.getInstance().get(myData.practitionerId, function (err2, res2) {
                                myData.practitioner = res2;
                                $rootScope.$apply(function () {
                                    if (err) {
                                        deferred.reject(err);
                                    } else if (err2) {
                                        deferred.reject(err2);
                                    } else {
                                        deferred.resolve(myData);
                                    }
                                });
                            });
                        }
                    }
                    if (!hasParent) {
                        $log.debug('no parent');
                        if (err) {
                            deferred.reject(err);
                        } else {
                            deferred.resolve(res);
                        }
                    }
                });
                return deferred.promise;
            },
            deleteDocByIdAndRev: function (id, rev) {
                var deferred = $q.defer();
                var doc = {
                    _id: id,
                    _rev: rev
                };
                $log.debug('deleting doc: ' + JSON.stringify(doc));
                pouchDb.getInstance().remove(doc, function (err, res) {
                    $rootScope.$apply(function () {
                        if (err) {
                            deferred.reject(err);
                        } else {
                            deferred.resolve(res);
                        }
                    });
                });
                return deferred.promise;
            }
        }
    })

    .factory('CareSvc', function ($q, pouchDAO, PractitionerSvc, NoteSvc) {
        return {
            queryAllCare: function () {
                var map = function (doc) {
                    if (doc.type === 'care') {
                        emit(doc.start, null);
                    }
                };
                return pouchDAO.findView(map, true);
            },
            saveCare: function (doc) {
                doc.type = 'care';
                return pouchDAO.saveDoc(doc);
            },
            queryOneCare: function (careId) {
                // todo: add check for type
                return pouchDAO.getDocById(careId);
            },
            deleteCare: function (careId, rev) {
                // delete all children objects first
                var practitionersToDelete = null;
                PractitionerSvc.queryForCare({_id: careId}, false).then(function (res) {
                    practitionersToDelete = res;
                    for (var p in practitionersToDelete) {
                        NoteSvc.deleteAllNotesForPractitionerId(practitionersToDelete[p]._id);
                    }
                });
                PractitionerSvc.deleteAllPractitionersForCareId(careId);
                NoteSvc.deleteAllNotesForCareId(careId);
                return pouchDAO.deleteDocByIdAndRev(careId, rev);
            }
        }
    })

    .factory('PractitionerSvc', function ($q, pouchDAO, NoteSvc, $log) {
        return {
            queryForCare: function (care, withParent) {
                cId = care._id;
                var map = function (doc) {
                    if (doc.type === 'practitioner' && doc.careId === cId) {
                        emit(doc.name, null);
                    }
                };
                if (withParent) {
                    return pouchDAO.findViewWithParent(map, false);
                } else {
                    return pouchDAO.findView(map, false);
                }
            },
            createPractitionerForCare: function (doc, careId) {
                doc.type = 'practitioner';
                doc.careId = careId;
                return pouchDAO.saveDoc(doc);
            },
            queryOne: function (practitionerId, withParents) {
                // todo: add check for type
                if (withParents) {
                    return pouchDAO.getDocByIdWithParent(practitionerId);
                } else {
                    return pouchDAO.getDocById(practitionerId);
                }
            },
            deleteOne: function (practitionerId, rev) {
                // delete all children objects first
                NoteSvc.deleteAllNotesForPractitionerId(practitionerId);
                return pouchDAO.deleteDocByIdAndRev(practitionerId, rev);
            },
            queryAllPractitioners: function (withParents) {
                var map = function (doc) {
                    if (doc.type === 'practitioner') {
                        emit(doc.name, null);
                    }
                };
                if (withParents) {
                    return pouchDAO.findViewWithParent(map, false);
                } else {
                    return pouchDAO.findView(map, false);
                }
            },
            deleteAllPractitionersForCareId: function (cId) {
                $log.debug('deleting all practitioners for care: ' + cId);
                var svc = this;
                var care = {_id: cId};
                var practitionersToDelete = null;
                svc.queryForCare(care, false).then(function (res) {
                    practitionersToDelete = res;
                    $log.debug('practitioners to delete: ' + JSON.stringify(practitionersToDelete));
                    for (var p in practitionersToDelete) {
                        $log.debug('deleting practitioner: ' + JSON.stringify(practitionersToDelete[p]));
                        svc.deleteOne(practitionersToDelete[p]._id, practitionersToDelete[p]._rev);
                    }
                })
            }
        }
    })

    .factory('NoteSvc', function ($q, pouchDAO, $log) {
        return {
            queryAllForPractitioner: function (practitioner, withParent) {
                pId = practitioner._id;
                $log.debug('inside NoteSvc.queryAllForPractitioner, pId=' + pId);
                var map = function (doc) {
                    if (doc.type === 'note' && doc.practitionerId === pId) {
                        emit(doc.date, null);
                    }
                };
                if (withParent) {
                    return pouchDAO.findViewWithParent(map, true);
                } else {
                    return pouchDAO.findView(map, true);
                }
            },
            queryAllForCare: function (care, withParent) {
                cId = care._id;
                var map = function (doc) {
                    if (doc.type === 'note' && doc.careId === cId) {
                        emit(doc.date, null);
                    }
                };
                if (withParent) {
                    return pouchDAO.findViewWithParent(map, true);
                } else {
                    return pouchDAO.findView(map, true);
                }
            },
            createNoteForPractitioner: function (doc, practitionerId) {
                doc.type = 'note';
                doc.practitionerId = practitionerId;
                if (!doc.date) {
                    doc.date = new Date();
                }
                return pouchDAO.saveDoc(doc);
            },
            createNoteForCare: function (doc, careId) {
                doc.type = 'note';
                doc.careId = careId;
                if (!doc.date) {
                    doc.date = new Date();
                }
                return pouchDAO.saveDoc(doc);
            },
            queryOne: function (noteId, withParents) {
                // todo: add check for type
                if (withParents) {
                    return pouchDAO.getDocByIdWithParent(noteId);
                } else {
                    return pouchDAO.getDocById(noteId);
                }
            },
            deleteOne: function (noteId, rev) {
                return pouchDAO.deleteDocByIdAndRev(noteId, rev);
            },
            queryAllNotes: function (withParents) {
                var map = function (doc) {
                    if (doc.type === 'note') {
                        emit(doc.date, null);
                    }
                };
                if (withParents) {
                    return pouchDAO.findViewWithParent(map, true);
                } else {
                    return pouchDAO.findView(map, true);
                }
            },
            deleteAllNotesForPractitionerId: function (pId) {
                $log.debug('deleting all notes for practitioner: ' + pId);
                var svc = this;
                var practitioner = {_id: pId};
                var notesToDelete = null;
                svc.queryAllForPractitioner(practitioner, false).then(function (res) {
                    notesToDelete = res;
                    $log.debug('notes to delete: ' + JSON.stringify(notesToDelete));
                    for (var n in notesToDelete) {
                        $log.debug('deleting note: ' + JSON.stringify(notesToDelete[n]));
                        svc.deleteOne(notesToDelete[n]._id, notesToDelete[n]._rev);
                    }
                })
            },
            deleteAllNotesForCareId: function (cId) {
                $log.debug('deleting all notes for care: ' + cId);
                var svc = this;
                var care = {_id: cId};
                var notesToDelete = null;
                svc.queryAllForCare(care, false).then(function (res) {
                    notesToDelete = res;
                    $log.debug('notes to delete: ' + JSON.stringify(notesToDelete));
                    for (var n in notesToDelete) {
                        $log.debug('deleting note: ' + JSON.stringify(notesToDelete[n]));
                        svc.deleteOne(notesToDelete[n]._id, notesToDelete[n]._rev);
                    }
                })
            }
        }
    })

    .factory('CredentialsHolder', ['$log', 'CONFIGS', function ($log, CONFIGS) {
        var params = {};
        return {
            getCredentials: function () {
                params.email = window.sessionStorage.getItem(CONFIGS.LOCAL_STORAGE_EMAIL_KEY);
                params.pass = window.sessionStorage.getItem(CONFIGS.LOCAL_STORAGE_PASS_KEY);
                return params;
            },
            setCredentials: function (email, pass) {
                $log.debug('saving email, pass');
                window.sessionStorage.setItem(CONFIGS.LOCAL_STORAGE_EMAIL_KEY, email);
                window.sessionStorage.setItem(CONFIGS.LOCAL_STORAGE_PASS_KEY, pass);
            },
            resetCredentials: function () {
                $log.debug('reset email, pass');
                window.sessionStorage.removeItem(CONFIGS.LOCAL_STORAGE_EMAIL_KEY);
                window.sessionStorage.removeItem(CONFIGS.LOCAL_STORAGE_PASS_KEY);
            },
            isLoggedIn: function () {
                return true;
                /*
                 $log.debug('checking if user is logged in...');
                 var email = window.sessionStorage.getItem(CONFIGS.LOCAL_STORAGE_EMAIL_KEY);
                 $log.debug('email: ' + email);
                 return email != null;
                 */
            }
        }
    }])

    // service to make login/logout requests to remote server
    .factory('AuthenticationService', ['$http', '$log', '$state', '$ionicPopup', 'CredentialsHolder', 'LoaderService',
        function ($http, $log, $state, $ionicPopup, CredentialsHolder, LoaderService) {
            return {
                login: function (user) {
                    LoaderService.show(100);
                    // todo: validate credentials against credentials in PouchDB (added during setup)
                    if (user.email === 'joe@test.com' && user.password === 'test') {
                        CredentialsHolder.setCredentials(user.email, user.password);
                        LoaderService.hide();
                        $state.go('tab.cares');
                    } else {
                        setTimeout(function () {
                            $ionicPopup.alert({
                                title: 'Error',
                                content: '<div style="text-align: center;">Incorrect email or password</div>'
                            }).then(function (res) {
                                    LoaderService.hide();
                                });
                        }, 100);
                    }
                },
                logout: function () {
                    $log.debug('user logged out');
                    CredentialsHolder.resetCredentials();
                    $state.go('login');
                }
            }
        }])

    // trigger the loading indicator
    .factory('LoaderService', function ($rootScope, $ionicLoading) {
        return {
            show: function (delay) {
                $rootScope.loading = $ionicLoading.show({
                    content: '<h1><i class="icon ion-ios7-reloading"></i></h1>',
                    animation: 'fade-in',
                    showBackdrop: true,
                    maxWidth: 200,
                    showDelay: delay > 0 ? delay : 0
                });
            },
            hide: function () {
                $rootScope.loading.hide();
            }
        }
    })

    .factory('ModalSvc', function ($ionicModal, $ionicPopup) {
        return {
            setupModal: function (type, $scope, $log) {
                $ionicModal.fromTemplateUrl('templates/modal-' + type + '.html',
                    function (modal) {
                        if (type == 'care') {
                            $scope.careModal = modal;
                        } else if (type == 'practitioner') {
                            $scope.practitionerModal = modal;
                        } else if (type == 'note') {
                            $scope.noteModal = modal;
                        } else if (type == 'careList') {
                            $scope.careListModal = modal;
                        } else if (type == 'practitionerList') {
                            $scope.practitionerListModal = modal;
                        } else if (type == 'share') {
                            $scope.shareModal = modal;
                        }
                        $log.debug(type + ' modal setup');
                    },
                    {
                        scope: $scope,
                        animation: 'slide-in-up'
                    });
            },
            alert: function (message) {
                $ionicPopup.alert({
                    title: 'Error',
                    content: '<div style="text-align: center;">' + message + '</div>'
                })
            }
        }
    })

    .factory('ppDebugSvc', function ($q, pouchDb, $rootScope) {
        return {
            queryAll: function () {
                var deferred = $q.defer();
                pouchDb.getInstance().allDocs({include_docs: true}, function (err, res) {
                    $rootScope.$apply(function () {
                        if (err) {
                            deferred.reject(err);
                        } else {
                            if (!res.rows.length) {
                                deferred.resolve(0);
                            } else {
                                var myData = [];
                                for (var r in res.rows) {
                                    myData[r] = res.rows[r].doc;
                                }
                                deferred.resolve(myData);
                            }
                        }
                    });
                });
                return deferred.promise;
            },
            dbInfo: function () {
                var deferred = $q.defer();
                pouchDb.getInstance().info(function (err, res) {
                    $rootScope.$apply(function () {
                        if (err) {
                            deferred.reject(err);
                        } else {
                            deferred.resolve(res);
                        }
                    });
                });
                return deferred.promise;
            },
            careStats: function () {
                var deferred = $q.defer();
                var map = function (doc) {
                    if (doc.type === 'care') {
                        emit(doc.type, null);
                    }
                };
                pouchDb.getInstance().query(map, {reduce: '_stats'}, function (err, res) {
                    $rootScope.$apply(function () {
                        if (err) {
                            deferred.reject(err);
                        } else {
                            deferred.resolve(res);
                        }
                    });
                });
                return deferred.promise;
            },
            practitionerStats: function () {
                var deferred = $q.defer();
                var map = function (doc) {
                    if (doc.type === 'practitioner') {
                        emit(doc.type, null);
                    }
                };
                pouchDb.getInstance().query(map, {reduce: '_stats'}, function (err, res) {
                    $rootScope.$apply(function () {
                        if (err) {
                            deferred.reject(err);
                        } else {
                            deferred.resolve(res);
                        }
                    });
                });
                return deferred.promise;
            },
            noteStats: function () {
                var deferred = $q.defer();
                var map = function (doc) {
                    if (doc.type === 'note') {
                        emit(doc.type, null);
                    }
                };
                pouchDb.getInstance().query(map, {reduce: '_stats'}, function (err, res) {
                    $rootScope.$apply(function () {
                        if (err) {
                            deferred.reject(err);
                        } else {
                            deferred.resolve(res);
                        }
                    });
                });
                return deferred.promise;
            },
            deleteAllData: function() {
                pouchDb.destroy();
            }
        }
    })

    .factory('EmailSvc', function ($log, PractitionerSvc, NoteSvc) {
        return {
            shareCare: function (care, toRecipients) {
                $log.info('toRecipients: ' + toRecipients);
                var practitioners = [];
                var notes = [];
                var transcript = printCare(care);

                NoteSvc.queryAllForCare(care, true).then(function (careNotes) {
                    for (var n in careNotes) {
                        transcript += printNote(careNotes[n]);
                    }
                    PractitionerSvc.queryForCare(care, true).then(function (carePractitioners) {
                        practitioners = carePractitioners;
                        NoteSvc.queryAllNotes(false).then(function (allNotes) {
                            notes = allNotes;
                            for (var p in practitioners) {
                                transcript += printPractitioner(practitioners[p]);
                                for (var n in notes) {
                                    if (notes[n].practitionerId == practitioners[p]._id) {
                                        transcript += printNote(notes[n]);
                                    }
                                }
                            }
                            $log.info(transcript);
                            window.plugin.email.open({
                                to: toRecipients,
                                subject: 'Shared via Sawacare',
                                body: transcript
                            });
                        });
                    });
                });
            },
            sharePractitioner: function (practitioner, toRecipients) {
                $log.info('toRecipients: ' + toRecipients);
                var notes = [];
                var transcript = '';
                if (practitioner.care) {
                    transcript += printCare(practitioner.care);
                }
                transcript += printPractitioner(practitioner); // or flag, with care info
                NoteSvc.queryAllNotes(false).then(function (res2) {
                    notes = res2;
                    for (var n in notes) {
                        if (notes[n].practitionerId == practitioner._id) {
                            transcript += printNote(notes[n]);
                        }
                    }
                    $log.info(transcript);
                    window.plugin.email.open({
                        to: toRecipients,
                        subject: 'Shared via Sawacare',
                        body: transcript
                    });
                });
            },
            shareNote: function (note, toRecipients) {
                $log.info('toRecipients: ' + toRecipients);
                var transcript = '';
                if (note.practitioner) {
                    transcript += printPractitioner(note.practitioner);
                } else if (note.care) {
                    transcript += printCare(note.care);
                }
                transcript += printNote(note);
                $log.info(transcript);
                window.plugin.email.open({
                    to: toRecipients,
                    subject: 'Shared via Sawacare',
                    body: transcript
                });
            }
        }
    })
;

var printCare = function (care) {
    var transcript = '';
    var careHeader = 'Care: ' + care.facilityName;
    if (care.location) {
        careHeader += ' in ' + care.location;
    }
    careHeader += '\n';
    transcript += careHeader;
    for (var i = 0; i < 4; i++) {
        transcript += '=';
    }
    transcript += '\n';
    transcript += care.start + ' to ' + (care.end ? care.end : 'Present') + '\n';
    transcript += 'Reason: ' + care.reason + '\n';
    return transcript;
};

var printPractitioner = function (practitioner) {
    var transcript = '';
    var pracHeader = 'Practitioner: ' + practitioner.name + ', ' + practitioner.specialty + '\n';
    transcript += '\n' + pracHeader;
    for (var i = 0; i < 13; i++) {
        transcript += '-';
    }
    transcript += '\n';
    if (practitioner.phone) {
        transcript += 'Phone: ' + practitioner.phone + '\n';
    }
    if (practitioner.email) {
        transcript += 'Email: ' + practitioner.email + '\n';
    }
    return transcript;
};

var printNote = function (note) {
    var parsedDate = moment(note.date);
    var transcript = '';
    var noteHeader = 'Note: ' + parsedDate.format('LLL') + '\n';
    transcript += '\n' + noteHeader;
    for (var i = 0; i < 4; i++) {
        transcript += '+';
    }
    transcript += '\n';
    transcript += note.content + '\n\n';
    return transcript;
}
