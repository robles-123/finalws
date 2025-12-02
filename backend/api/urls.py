from django.urls import path
from . import views

urlpatterns = [
    # Seminars
    path('seminars/', views.seminars_list_create, name='seminars_list_create'),
    path('seminars/<str:seminar_id>/', views.seminar_detail, name='seminar_detail'),

    # Attendance (time in/out)
    path('seminars/<str:seminar_id>/attendance/', views.seminar_attendance_list, name='seminar_attendance_list'),
    path('seminars/<str:seminar_id>/attendance/time_in/', views.seminar_time_in, name='seminar_time_in'),
    path('seminars/<str:seminar_id>/attendance/time_out/', views.seminar_time_out, name='seminar_time_out'),

    # Joined Participants
    path('seminars/<str:seminar_id>/participants/', views.joined_participants_list, name='joined_participants_list'),
    path('seminars/<str:seminar_id>/participants/join/', views.save_joined_participant, name='save_joined_participant'),
    path('seminars/<str:seminar_id>/participants/check_in/', views.check_in_participant, name='check_in_participant'),
    path('seminars/<str:seminar_id>/participants/check_out/', views.check_out_participant, name='check_out_participant'),

    # Evaluations
    path('seminars/<str:seminar_id>/evaluations/', views.fetch_evaluations, name='fetch_evaluations'),
    path('seminars/<str:seminar_id>/evaluations/submit/', views.save_evaluation, name='save_evaluation'),
    path('seminars/<str:seminar_id>/evaluations/check/', views.has_evaluated, name='has_evaluated'),
]
