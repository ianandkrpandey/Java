var myApp = angular.module('myApp', []);
var soundForClick = null;
var email;
var myBoard;

var ws = new WebSocket("ws://localhost:8080/game");

ws.onopen = function (message) {
    email = user_data.email;
    ws.send("REG-" + email);
    getListUserOnline();
};

ws.onmessage = function (message) {
    var data = message.data.split("-|-");
    switch (data[0]) {
        case "REQHANDSHAKE":
            var scope = angular.element($(document.body)).scope();
            for(var i=0; i<scope.userOnline.length; i++){
                if(scope.userOnline[i].email==data[1]){
                    scope.opponent=scope.userOnline[i];
                    break;
                }
            }
            $('#modalAcceptChallenge').modal({
                backdrop: 'static',
                keyboard: false
            });
            $('#modalAcceptChallenge').modal('show');
            break;
        case "REPHANDSHAKE":
            var accept = data[1];  // 0 : yes , 1 : no
            if (accept == "0") {
                $('#modalWaitingAcceptChallenge').modal('hide');
            }else{
                // the enemy decline to accept
                alert('Player decline');
                $('#modalWaitingAcceptChallenge').modal('hide');
            }
            break;
        case "REQPAUSE":
            var accept = data[1];
            alert("Request pause");
            repPause(1);
            break;
        case "REPPAUSE":
            var accept = data[1]; // 0 : yes , 1 : no
            if (accept == "0") {
                console.log("continue");
            }else{
                alert("Decline pause");
            }
            break;
        case "REQNEWGAME":
            alert("req new game");
            repNewGame(0);
            break;
        case "REPNEWGAME":
            var accept = data[1];
            if (accept == "0") {
                campOrder = 0;
                var chessGame=new ChessGame("board");
                chessGame.init();
            }else{
                // the enemy decline to accept
            }
            break;
        case "REQDRAW":
            alert("User request draw game");
            repDrawGame(1);
            break;
        case "REPDRAW":

            break;
        case "LOSE":
            alert("User "+data[1]+ "accept lose");
            break;
        case "PLAY":
            var tmp = data[1].split(" ");
            var pos1 = tmp[0].split(",");
            var pos2 = tmp[1].split(",");
            var chessPos1 = new Point(pos1[0],9-pos1[1]);
            var chessPos2 = new Point(pos2[0],9-pos2[1]);
            myBoard.MoveEnemyChess(chessPos1,chessPos2,tmp[3]);
            //myBoard.changeMover(tmp[3]);
            break;
        case "MOVER":
            myBoard.changeMover(data[1]);
            break;
        case "CHAT":
            var text = data[1].replace("CHAT-|-", ""); // cut 'CHAT-|-' out data[1]
            var scope = angular.element($(document.body)).scope();
            scope.$apply(function(){
                scope.messages.push({'text': text, 'yours': true});
                scope.yourMessage = "";
            });
            document.getElementById("talks").scrollTop = document.getElementById("talks").scrollHeight;
            soundForClick.play();
            break;
        default :
            break;
    }
};

ws.onclose =function(message){ ws.close();};

function requestHandShake(email){
    ws.send("REQHANDSHAKE-"+email);
}

function repHandShake(rep){
    ws.send("REPHANDSHAKE-" + getEmailCurrentPlayer()+"-"+rep);
}

function requestNewGame(){
    ws.send("REQNEWGAME-"+ getEmailCurrentPlayer());
}

function repNewGame(rep){
    if(rep=="0"){
        //ws.send("REPNEWGAME-"+ getEmailCurrentPlayer()+"-0");
        campOrder=1;
        var chessGame=new ChessGame("board");
        chessGame.init();
    }
    ws.send("REPNEWGAME-" + getEmailCurrentPlayer()+"-"+rep);
}
function requestPause() {
    ws.send("REQPAUSE-" + getEmailCurrentPlayer());
}

function repPause(rep){
    ws.send("REPPAUSE-" + getEmailCurrentPlayer()+"-"+rep);
}

function acceptLose() {
    ws.send("LOSE-" + getEmailCurrentPlayer());
}

function requestDrawGame() {
    ws.send("REQDRAW-" + getEmailCurrentPlayer());
}

function repDrawGame(rep){
    ws.send("REPDRAW-" +getEmailCurrentPlayer()+"-"+rep);
}

function getEmailCurrentPlayer(){
    var scope = angular.element($(document.body)).scope();
    return scope.opponent.email;
}

function playerMove(data){
    ws.send("PLAY-"+getEmailCurrentPlayer()+","+email+"-"+data);
}

function sendChat(data){
    ws.send(data);
}

function getListUserOnline(){
    var scope = angular.element($(document.body)).scope();
    $.getJSON("http://localhost:8080/rest/online", function (result) {
        result = result
            .filter(function (el) {
                return el.name != scope.myProfile.name;
            });
        scope.userOnline = result;
        scope.$apply();
    });
}

myApp.controller('MyAppController', function ($scope, $http) {

    soundManager.setup({
        onready: function () {
            soundForClick = soundManager.createSound({
                url: 'resources/extra/sounds/click-button.mp3'
            });
        },
        ontimeout: function () {
        }
    });
    $scope.userOnline = [];
    $scope.myProfile =user_data;
    $scope.messages = [];
    $scope.yourMessage = "";
    $scope.titleOfChatConversation = "TO : ";
    $scope.countDown = 15;
    $scope.opponent = {};

    /**
    * GET list user online from server
    **/
    //$.getJSON("http://localhost:8080/rest/online", function (result) {
    //    result = result
    //        .filter(function (el) {
    //            return el.name != $scope.myProfile.name;
    //        });
    //    $scope.userOnline = result;
    //    userOnlines=result;
    //});

    /**
     * SHOW list user online
     **/
    $scope.showListUser = function () {
        $.getJSON("http://localhost:8080/rest/online", function (result) {
            result = result
                .filter(function (el) {
                    return el.name != $scope.myProfile.name;
                });
            $scope.userOnline = result;
            $scope.$apply();
        });
        soundForClick.play();
        $('#modalListUser').modal("show");
    };

    /**
     * SEND message from CHAT conversation to server
     * @param keyEvent
     **/
    $scope.sendMessage = function (keyEvent) {
        if (keyEvent.which == 13) {
            if ($scope.yourMessage != null & $scope.yourMessage != "") {
                $scope.messages.push({'text': $scope.yourMessage, 'yours': false});
                var to_client_id=getEmailCurrentPlayer();
                sendChat("CHAT-"+ to_client_id + "-" + $scope.yourMessage);
                /**
                 *
                 */
                soundForClick.play();
                $scope.yourMessage = "";
                document.getElementById("talks").scrollTop = document.getElementById("talks").scrollHeight;
            }
        }
    };

    /**
     * CHALLENGE user in list user online
     * @param user
     **/
    $scope.challengeUser = function (user) {
        soundForClick.play();
        $('#modalListUser').modal("hide");
        $('#modalWaitingAcceptChallenge').modal("show");
        $scope.opponent=user;
        $scope.countDown=15;
        requestHandShake($scope.opponent.email);
        var timeCountDown = setInterval(function(){
            if($scope.countDown>0){
                $scope.countDown--;
                $scope.$apply();
            }else{
                clearInterval(timeCountDown);
                $('#modalWaitingAcceptChallenge').modal("hide");
            }
        },1000);

    };

    /**
     * ADD friend with user in list user online
     **/
    $scope.addFriend = function () {
        soundForClick.play();
    };

    /**
     * ACCEPT | DECLINE challenge from opponent
     **/
    $scope.acceptChallenge=function(){
        soundForClick.play();
        repHandShake(0);
    };
    $scope.declineChallenge=function(){
        repHandShake(1);
        soundForClick.play();
    };

});