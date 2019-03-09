$(document).ready(
    function(){
            /*

            $('#job_table').DataTable({"order":[0, 'desc']});
            var list = [{% for m in matched %}"{{m}}",{% endfor %}];
            $.each(list, function(index, value){
                v = $("<div/>").html(value).text();
                $("pre").highlight(v);
            });
            */
            $('a.colorbox').colorbox({'photo':true});
    }
);

window.onscroll = function() {scrollFunction()};

function scrollFunction() {
  if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
    document.getElementById("toTop").style.display = "block";
  } else {
    document.getElementById("toTop").style.display = "none";
  }
}
function topFunction() {
  document.body.scrollTop = 0; // For Safari
  document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
}