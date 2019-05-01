/* global jsyaml */

// Jquery form convert to JSON
(function ($) {
  $.fn.serializeFormJSON = function () {

    var o = {};
    var a = this.serializeArray();
    $.each(a, function () {
      if (o[this.name]) {
        if (!o[this.name].push) {
          o[this.name] = [o[this.name]];
        }
        o[this.name].push(this.value || '');
      } else {
        o[this.name] = this.value || '';
      }
    });
    return o;
  };
})(jQuery);




app = {
  config: {
    apiUrl: window.location.protocol + "//" + window.location.host + "/"
  },
  init: function (cb) {
    app.api.init(function (ok, resp) {
      if (ok) {
        var footer = "&copy; " + app.api.info.service.name + " API v" + app.api.info.service.version + " <span style='color:grey'>on host  " + app.api.info.server.hostname + "</span>";
        $("#appFooter").html(footer);
        app.api.getFree("config/session.json", null, function (ok, response) {
          if (ok) {
            app.api.session = response;
            $("#courseID").text(app.api.session.course);
            app.api.getFree("course-data/manifest.yml", null, function (ok, response) {
              if (ok) {
                app.api.course = jsyaml.load(response);
                if (typeof cb === "function")
                  cb();
              }
              else {
                var resp1 = (response.message || response.statusText || response);
                var message = "Could not find training course detail because " + resp1;
                $(app.tools.alertBox("danger", message)).prependTo("div#mainContainer");
                console.error(resp1);
              }
            });
          }
          else {
            var resp1 = (response.message || response.statusText || response);
            var message = "Could not find training session detail because " + resp1;
            $(app.tools.alertBox("danger", message)).prependTo("div#mainContainer");
            console.error(resp1);
          }
        });
      }
      else {
        var message = "Could not connect to LIBRE API because " + resp;
        $(app.tools.alertBox("danger", message)).prependTo("div#mainContainer");
        console.error(resp);
      }
    });
  },
  initInfo: function () {
    app.init(function () {
      app.infoPage.init();
    });
  },
  initSurvey: function () {
    app.init(function () {
      app.survey.init();
    });
  },
  initSignsheet: function () {
    app.init(function () {
      app.signsheet.init();
    });
  },
  api: {
    info: null,
    init: function (callback) {
      this.get("info", null, function (error, response) {
        if (error) {
          app.api.info = response;
          if (typeof callback === "function")
            callback(true, response);
          else
            console.log(response);
        }
        else {
          var message = (error.message || error.statusText || error);
          if (typeof callback === "function")
            callback(false, message);
          else
            console.error(message);
        }
      });
    },
    get: function (path, query, callback) {
      return this.call("GET", path, query, callback);
    },
    getFree: function (path, query, callback) {
      var config = {
        method: "GET",
        url: app.config.apiUrl + path
      };
      if (query && query !== null && query !== false) {
        config.data = query;
      }
      $.ajax(config)
      .always(function (response, status) {
        if (status === "success") {
          callback(true, response);
        }
        else {
          callback(false, response);
        }
      });
    },
    post: function (path, query, callback) {
      return this.call("POST", path, query, callback);
    },
    put: function (path, query, callback) {
      return this.call("PUT", path, query, callback);
    },
    delete: function (path, query, callback) {
      return this.call("DELETE", path, query, callback);
    },
    call: function (method, path, query, callback) {
      var config = {
        method: method,
        url: app.config.apiUrl + path
      };
      if (query && query !== null && query !== false) {
        config.data = query;
      }
      $.ajax(config)
      .always(function (response, status) {
        if (status === "success") {
          if (response.code === "ok") {
            callback(true, response.data);
          }
          else {
            callback(false, response);
          }
        }
        else {
          callback(false, response);
        }
      });
    }
  },
  survey: {
    init: function () {
      if (app.api.course !== undefined) {
        $(".courseInfoID .form-control-static").text(app.api.course.id + " v" + app.api.course.version);
        $(".courseInfoName .form-control-static").text(app.api.course.name);
        $(".courseInfoFormat .form-control-static").text(app.api.course.schedule.days + "days (" + app.api.course.schedule.hours + " hours)");
      }
      if (app.api.session !== undefined) {
        $(".sessionInfoInstructor .form-control-static").text(app.api.session.instructor);
        $(".sessionInfoState .form-control-static").text(app.api.session.state);
        $(".sessionInfoType .form-control-static").text(app.api.session.type);
        $(".sessionInfoStart .form-control-static").text(app.api.session.start);
        var table = $("#surveyList .table");
        $(app.api.session.students).each(function (index, item) {
          var row = "<tr><td>" + item.workstation + "</td>";
          row += "<td>" + item.name + "</td>";
          row += "<td><a class=\"btn btn-primary btn-sm\" href=\"#\" onclick=\"app.survey.onClickEvaluate('" + item.id + "')\" target=\"blank\" role=\"button\"><span class=\"glyphicon glyphicon-thumbs-up\" aria-hidden=\"true\"></span> Evaluate</a></td>";
          row += "</tr>";
          table.append(row);
        });
        $("#surveyContainer button.btn-default").click(function () {
          $("#mainContainer").show();
          $("#surveyContainer").hide();
        });
        $("#surveyContainer button.btn-primary").click(function () {
          var jd = $("#surveyContainer form").serializeFormJSON();
          var errMsg = "You must give";
          if (!jd.id || jd.id === "") {
            errMsg = "Your student ID is not defined, please <b>report to your instructor</b>, " + errMsg;
          }
          if (!jd.company || jd.company === "") {
            errMsg += " your <b>company name</b>, ";
          }
          if (!jd.responsability || jd.responsability === "") {
            errMsg += " your <b>responsability</b>,";
          }
          if (!jd.name || jd.name === "") {
            errMsg += " your <b>first and last name</b>,";
          }
          if (!jd.email || jd.email === "") {
            errMsg += " your professional <b>e-mail</b>,";
          }
          if (!jd.phone || jd.phone === "") {
            errMsg += " your company <b>phone number</b>,";
          }
          if (errMsg === "You must give") {
            app.api.post("collect/survey-" + jd.id + ".json", JSON.stringify(jd), function (ok, response) {
              if (ok) {
                $(app.tools.infoBox("Thank you for submitting this survey")).prependTo("#mainContainer");
                $("#mainContainer").show();
                $("#surveyContainer").hide();
              }
              else {
                var resp1 = (response.message || response.statusText || response);
                var message = "Could not record your survey because " + resp1;
                $(app.tools.alertBox("danger", message)).prependTo("div#surveyContainer form");
                console.error(resp1);
              }
            });
          }
          else {
            $(app.tools.alertBox("danger", errMsg.substring(0, errMsg.length - 1) + ".")).prependTo("#surveyContainer form");
          }
        });
      }
    },
    onClickEvaluate: function (i) {
      $(app.api.session.students).each(function (index, item) {
        if (item.id === i) {
          $("#mainContainer").hide();
          $("#surveyContainer #inputID").val(item.id);
          $("#surveyContainer #inputName").val(item.name);
          $("#surveyContainer").show();
        }
      });
    }
  },
  signsheet: {
    pad: null,
    init: function () {
      if (app.api.session !== undefined) {
        this.generateUserTable("#usersList .table");
        if (app.api.course !== undefined) {
          this.generateTimetableTable("#usersTimetable .table");
        }
      }
      $("#userSignsheet").show();
      var el = document.getElementById('userSketchpad');
      app.signsheet.pad = new Sketchpad(el, {width: 500, height: 250});
      app.signsheet.pad.setLineColor('#000e44');
      app.signsheet.pad.setLineSize(5);
      window.onresize = function (e) {
        app.signsheet.pad.resize(el.offsetWidth);
      };
      $("#userSignsheet").dialog({
        autoOpen: false,
        modal: true,
        resizable: true,
        height: 400,
        width: 550,
        show: {
          effect: "fade",
          duration: 600
        },
        hide: {
          effect: "fade",
          duration: 300
        },
        buttons: {
          Undo: function () {
            app.signsheet.pad.undo();
          },
          Clear: function () {
            app.signsheet.pad.clear();
          },
          Close: function () {
            $(this).dialog("close");
          },
          Validate: function () {
            var student = $("#userSignsheet #signsheet_student").val(),
            day = $("#userSignsheet #signsheet_day").val(),
            daypart = $("#userSignsheet #signsheet_daypart").val(),
            dial = $(this);
            var svgid = 'signsheet-' + student + '-' + day + '-' + daypart;
            var svgcontent = app.signsheet.generateSVGSignature(svgid);
            var filename = "collect/" + svgid + ".svg";
            app.api.post(filename, svgcontent, function (ok, response) {
              if (ok) {
                app.signsheet.updateSignsheetSingleSignature(student, day, daypart);
                app.signsheet.pad.clear();
                dial.dialog("close");
              }
            });
          }
        }
      });
      $("#userSignsheet").hide();
    },
    generateSVGSignature: function (svgid) {
      var json = app.signsheet.pad.toJSON();
      var svg = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n';
      var width = 500, height = 250;
      svg += '<svg width="' + width + 'px" height="' + height + 'px" id="' + svgid + '" version="1.1" xmlns="http://www.w3.org/2000/svg">\n';
      for (var i in json.strokes) {
        var stroke = json.strokes[i];
        var path = '';
        for (var j in stroke.points) {
          var point = stroke.points[j];
          var x = Math.round(width * point.x);
          var y = Math.round(height * point.y);
          if (path === '') {
            path += 'M' + x + ' ' + y;
          }
          else {
            path += ' L ' + x + ' ' + y;
            path += ' M' + x + ' ' + y;
          }
        }
        path += ' Z';
        svg += '<path id="path' + i + '" d="' + path + '" stroke="#000000" stroke-width="5" style="stroke-linejoin:round;stroke-linecap:round"/>\n';
      }
      svg += '</svg>\n';
      return svg;
    },
    generateUserTable: function (tableSelector) {
      var table = $(tableSelector);
      if (app.api.session !== undefined && app.api.session.students !== undefined) {
        $(app.api.session.students).each(function (index, item) {
          var row = "<tr><td>" + item.name + "</td>";
          row += "<td><a class=\"btn btn-primary btn-sm\" href=\"#\" onclick=\"app.signsheet.onClickSelectStudent('" + item.id + "')\" target=\"blank\" role=\"button\"><span class=\"glyphicon glyphicon-edit\" aria-hidden=\"true\"></span> Sign</a></td>";
          row += "</tr>";
          table.append(row);
        });
      }
      else {
        table.append("<tr><td><i>No users</i></td></tr>");
      }
    },
    generateTimetableTable: function (tableSelector) {
      var displayOpt = {weekday: "long", year: "numeric", month: "long", day: "numeric"};
      var displayLang = "fr-FR";
      var table = $(tableSelector);
      $('thead', table).remove();
      var cellBtn = "<tr>";
      if (app.api.course.schedule !== undefined && app.api.course.schedule.timetable !== undefined) {
        $(app.api.course.schedule.timetable).each(function (index, courseday) {
          var startSubDate = new Date(Date.parse(app.api.session.start) + ((courseday.day - 1) * 24 * 60 * 60 * 1000));
          var startSubDisplay = startSubDate.toLocaleDateString(displayLang, displayOpt);
          var startSubID = startSubDate.toISOString().substring(0, 10);
          cellBtn += "<th>" + startSubDisplay + "</th>";
          cellBtn += "<td id=\"signsheet-cell-" + startSubID + "-am\">" + app.signsheet.generateTimetableTableButton(startSubID,'am') + "</td>";
          cellBtn += "<td id=\"signsheet-cell-" + startSubID + "-pm\">" + app.signsheet.generateTimetableTableButton(startSubID,'pm') + "</td>";
          cellBtn += "</tr><tr>";
        });
        table.append(cellBtn + "</tr>");
      }
      else {
        table.append("<thead><tr><td><i>No scheduled timetable</i></td></tr></thead>");
      }
    },
    generateTimetableTableButton: function (day,daypart) {
      return "<a class=\"btn btn-primary btn-sm\" href=\"#\" onclick=\"app.signsheet.onClickSelectDate('" + day + "','" + daypart + "')\" target=\"blank\" role=\"button\"><span class=\"glyphicon glyphicon-check\" aria-hidden=\"true\"></span> " + daypart + "</a>";    
    },
    onClickSelectStudent: function (i) {
      var scanUserSignsheet = [];
      if (app.api.course.schedule !== undefined && app.api.course.schedule.timetable !== undefined) {
        $(app.api.course.schedule.timetable).each(function (index, courseday) {
          var startSubDate = new Date(Date.parse(app.api.session.start) + ((courseday.day - 1) * 24 * 60 * 60 * 1000));
          var startSubID = startSubDate.toISOString().substring(0, 10);
          scanUserSignsheet.push({day: startSubID, slice: 'am'});
          scanUserSignsheet.push({day: startSubID, slice: 'pm'});
        });
      }
      $(app.api.session.students).each(function (index, student) {
        if (student.id === i) {
          $("#userSignsheet #signsheet_student").val(student.id);
          $("#usersTimetable .courseInfoName .form-control-static").text(student.name);
          if (student.id !== undefined) {
            $(scanUserSignsheet).each(function (index, period) {
              if (period.day !== undefined) {
                app.signsheet.updateSignsheetSingleSignature(student.id, period.day, period.slice);
              }
            });
          }
          $("#usersTimetable").show();
        }
      });
    },
    updateSignsheetSingleSignature: function (student, day, daypart) {
      if (student !== undefined && day !== undefined && daypart !== undefined) {
        var filename = "collect/signsheet-" + student + "-" + day + "-" + daypart + ".svg";
        app.api.getFree(filename, null, function (ok) {
            var td = $("#signsheet-cell-" + day + "-" + daypart);
            td.children().remove();
          if (ok) {
            var imgTag = '<img src="/' + filename + '"/>';
            td.html(imgTag);
          }
          else {
            td.html(app.signsheet.generateTimetableTableButton(day,daypart));
          }
        });
      }
    },
    onClickSelectDate: function (d, p) {
      if (app.api.course.schedule !== undefined && app.api.course.schedule.timetable !== undefined) {
        $(app.api.course.schedule.timetable).each(function (index, item) {
          var startSubDate = new Date(Date.parse(app.api.session.start) + ((item.day - 1) * 24 * 60 * 60 * 1000));
          var startSubID = startSubDate.toISOString().substring(0, 10);
          if (startSubID === d) {
            $("#userSignsheet #signsheet_day").val(startSubID);
            $("#userSignsheet #signsheet_daypart").val(p);
            $("#userSignsheet").dialog("open");
          }
        });
      }
    }
  },
  infoPage: {
    init: function () {
      if (app.api.course !== undefined) {
        $("#courseInfoID .form-control-static").text(app.api.course.id + " v" + app.api.course.version);
        $("#courseInfoName .form-control-static").text(app.api.course.name);
        $("#courseInfoDesc .form-control-static").text(app.api.course.desc);
        $("#courseInfoFormat .form-control-static").text(app.api.course.schedule.days + "days (" + app.api.course.schedule.hours + " hours)");
        $("#courseInfoUrlPub .form-control-static").html("<a class=\"btn btn-primary btn-sm\" href=\"" + app.api.course.url.public + "\" target=\"blank\" role=\"button\"><span class=\"glyphicon glyphicon-info-sign\" aria-hidden=\"true\"></span> Learn more on this course</a>");
        $("#courseInfoUrlManual .form-control-static").html("<a class=\"btn btn-primary btn-sm\" href=\"" + app.api.course.url.course + "\" target=\"blank\" role=\"button\"><span class=\"glyphicon glyphicon-bookmark\" aria-hidden=\"true\"></span> Learn more on this course</a>");
        var table = $("#courseInfo .table");
        $(app.api.course.content).each(function (index, item) {
          var row = "<tr><td>" + item.id + "</tdtime>";
          row += "<td>" + item.name + "</td><td>" + item.time + "min</td></tr>";
          table.append(row);
        });
      }
      if (app.api.session !== undefined) {
        $("#sessionInfoID .form-control-static").text(app.api.session.id);
        $("#sessionInfoName .form-control-static").text(app.api.session.course);
        $("#sessionInfoInstructor .form-control-static").text(app.api.session.instructor);
        $("#sessionInfoState .form-control-static").text(app.api.session.state);
        $("#sessionInfoType .form-control-static").text(app.api.session.type);
        $("#sessionInfoStart .form-control-static").text(app.api.session.start);
        var table = $("#sessionInfo .table");
        $(app.api.session.students).each(function (index, item) {
          var row = "<tr><td>" + item.workstation + "</td>";
          row += "<td>" + item.name + "</td>";
          row += "</tr>";
          table.append(row);
        });
      }
    }
  },
  tools: {
    alertBox: function (type, message) {
      return '<div class="alert alert-' + type + ' alert-dismissible" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>' + message + "</div>";
    },
    infoBox: function (message) {
      return '<div class="alert alert-info alert-dismissible" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>' + message + "</div>";
    }
  }
};
