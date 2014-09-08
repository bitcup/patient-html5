angular.module('sawa-patient.filters', [])
    .filter('showNote', function ($log) {
        return function (input) {
            if (input) {
                //$log.info('input is: ' + input);
                var sanitized = input;
                var htmlBreak = '<br>';
                sanitized = sanitized.split('\n').join(htmlBreak);
                return sanitized;
            }
            return input;
        }
    })

    .filter('showNoteHeader', function ($log) {
        return function (input) {
            if (input) {
                //$log.info('input is: ' + input);
                return input.split('\n')[0];
            }
            return input;
        }
    })

    .filter('showNoteBodyStart', function ($log) {
        return function (input) {
            if (input) {
                //$log.info('input is: ' + input);
                var pieces = input.split('\n');
                if (pieces.length > 1) {
                    for (var i = 1; i<pieces.length; i++) {
                        if (pieces[i]) {
                            return pieces[i];
                        }
                    }
                }
                return '';
            }
            return input;
        }
    })

    .filter('showNoteBodyHTML', function ($log) {
        return function (input) {
            if (input) {
                //$log.info('input is: ' + input);
                var pieces = input.split('\n');
                var body = '';
                for (var i = 1; i<pieces.length; i++) {
                    body += pieces[i] + '<br>';
                }
                return body;
            }
            return input;
        }
    })

    .filter('practitionerBlurb', function ($log) {
        return function (practitioner) {
            if (practitioner) {
                var blurb =
                    "You have assigned <b>" + practitioner.name +
                        "</b> to <b>" + practitioner.care.facilityName +
                        "</b> where you receive care for '" + practitioner.care.reason +
                        " from " + practitioner.care.start +
                        " to " + practitioner.care.end + ".";
                return blurb;
            }
            return practitioner;
        }
    })

    .filter('tel', function () {
        return function (tel) {
            if (!tel) {
                return '';
            }

            var value = tel.toString().trim().replace(/^\+/, '');

            if (value.match(/[^0-9]/)) {
                return tel;
            }

            var country, city, number;

            switch (value.length) {
                case 10: // +1PPP####### -> C (PPP) ###-####
                    country = 1;
                    city = value.slice(0, 3);
                    number = value.slice(3);
                    break;

                case 11: // +CPPP####### -> CCC (PP) ###-####
                    country = value[0];
                    city = value.slice(1, 4);
                    number = value.slice(4);
                    break;

                case 12: // +CCCPP####### -> CCC (PP) ###-####
                    country = value.slice(0, 3);
                    city = value.slice(3, 5);
                    number = value.slice(5);
                    break;

                default:
                    return tel;
            }

            if (country == 1) {
                country = "";
            }

            number = number.slice(0, 3) + '-' + number.slice(3);

            return (country + " (" + city + ") " + number).trim();
        };
    })

;