'use strict';

//The Nest API will emit events from this URL.
var NEST_API_URL = 'https://developer-api.nest.com';

var app = angular.module('myApp.controllers', ['ui.knob']);

app.config(['$httpProvider', function($httpProvider) {
	$httpProvider.defaults.useXDomain = true;
	delete $httpProvider.defaults.headers.common['X-Requested-With'];
}]);

/* Controllers */
app.controller('NestCtrl', function ($scope) {
	if (!window.EventSource) {
		alert('Your browser does not support EventSource. Try another browser.');
		throw new Error('Your browser does not support EventSource.');
	}

	// Get auth token from cookie.
	var token = Cookies.get('nest_token');

	if (token) {
		$('#signin-btn').text('Sign out').attr('href', '/auth/logout');
	} else {
		$('#signin-btn').text('Sign in to Nest');
		throw new Error('You are not signed in. Please sign in.');
	}

	/**
	 * Create an EventSource object which handles the long-running GET request to
	 * the Nest REST Streaming API. The EventSource object emits events as they are
	 * published by the API.
	 */
	var source = new EventSource(NEST_API_URL + '?auth=' + token);

	/**
	 * The 'put' event is received when a change is made to any of the Nest devices.
	 * This callback will render all of the new device states to the browser.
	 */
	source.addEventListener('put', function(e) {
		var data = JSON.parse(e.data).data || {};
		var devices = data.devices || {};
		var thermostats = devices.thermostats || {};
		var smokeAlarms = devices.smoke_co_alarms || {};
		var cameras = devices.cameras || {};
		var structures = data.structures || {};

		var structureArr = Object.keys(structures).map(function(id) {
			var thermostatIds = structures[id].thermostats || [];
			var smokeAlarmIds = structures[id].smoke_co_alarms || [];
			var cameraIds = structures[id].cameras || [];

			$scope.nest_name = structures[id].name;
			$scope.away = structures[id].away;
			$scope.thermostats = thermostatIds.map(function(id) { return thermostats[id]; });
			$scope.smoke_alarms = smokeAlarmIds.map(function(id) { return smokeAlarms[id]; });
			$scope.cameras = cameraIds.map(function(id) { return cameras[id]; });

			// Set options for thermostat ui-knob
			$scope.options = {
					scale: {
						enabled: true,
						type: 'lines',
						color: 'gray',
						width: 1,
						quantity: 20,
						height: 8
					},
					subText: {
						enabled: true,
						text: 'Fahrenheit',
						color: 'gray'
					},
					trackWidth: 30,
					barWidth: 30,
					step: 5,
					bgColor: '#2C3E50',
					textColor: '#eee',
					barColor: '#FFAE1A',
					readOnly: true,
			};

			$scope.$apply();

			return;
		});
	});

	/**
	 * When the authentication token is revoked, log out the user.
	 */
	source.addEventListener('auth_revoked', function(e) {
		window.location = '/auth/logout';
	});

	/**
	 * The 'error' event is emitted when an error occurs, such as when the connection
	 * between the EventSource and the API is lost.
	 */
	source.addEventListener('error', function(e) {
		if (e.readyState == EventSource.CLOSED) {
			console.error('Connection was closed! ', e);
		} else {
			console.error('An error occurred: ', e);
		}
	}, false);
}).
controller('HueCtrl', function ($scope, $http) {
	// Get philips hue url from cookie.
	$http({
		method: 'GET',
		url: '/hue-config.json'
	}).
	success(function(data){
		$http({
			method: 'GET',
			url: data.bridge_url + data.username + '/groups'
		}).
		success(function (response) {
			$scope.groups = response;
			$(document).ready(function (response) {
				Object.keys($scope.groups).map(function(id) {
					if ($scope.groups[id].state.all_on) {
						$('#toggle-' + (id-1)).bootstrapToggle('on');
					}
					else {
						$('#toggle-' + (id-1)).bootstrapToggle('off');
					}
				});
			});
		}).
		error(function (response) {
			$scope.name = 'Error!';
		});
	}).
	error(function (response) {
		$scope.name = 'Error';
	});
});
