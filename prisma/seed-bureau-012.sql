-- Jeu de démonstration du bureau de modération (spec 012, T002 ; lot 2).
--
-- Comptes factices (domaine réservé .test), aucune donnée réelle. À charger
-- dans une base **jetable** seulement, après `prisma migrate deploy` :
--   docker exec -i <conteneur> psql -v ON_ERROR_STOP=1 -U libre -d <base> < prisma/seed-bureau-012.sql
-- Le premier bloc refuse toute base dont le nom ne dit pas qu'elle est
-- jetable : jamais Neon, jamais la production.
DO $$ BEGIN
  IF current_database() !~ '(test|pixels|e2e|demo|local)' THEN
    RAISE EXCEPTION 'seed-bureau-012 refusé : la base « % » n’est pas une base jetable.', current_database();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION u(p_id uuid, p_pseudo text, p_role text, p_created timestamptz, p_seen date, p_verified bool, p_banned bool, p_confirmed bool, p_retrait timestamptz, p_device text, p_photos text[]) RETURNS void AS $$
BEGIN
  INSERT INTO users (id, email, "normalizedEmail", "emailVerified", "displayName", role, "createdAt", "isVerified", "isBanned", "retraitAt", "lastActive", last_seen_at, "deviceId")
  VALUES (p_id, lower(replace(p_pseudo,'.','')) || '@exemple.test', lower(replace(p_pseudo,'.','')) || '@exemple.test', CASE WHEN p_confirmed THEN p_created END, p_pseudo, p_role, p_created, p_verified, p_banned, p_retrait, now(), p_seen, p_device);
  INSERT INTO profiles ("userId", orientation, "relationshipType", interests, photos, "updatedAt") VALUES (p_id, '{}', '{}', '{}', p_photos, now());
END $$ LANGUAGE plpgsql;

SELECT u('00000000-0000-4000-8000-000000000001','Toi','ADMIN', now()-interval '1 year', current_date, true,false,true,null,null,'{}');
SELECT u('00000000-0000-4000-8000-000000000002','Sam','ADMIN', now()-interval '1 year', current_date, true,false,true,null,null,'{}');
SELECT u('00000000-0000-4000-8000-000000000010','Julien_84','USER', now()-interval '2 days', current_date, false,false,true,null,'dj','{}');
SELECT u('00000000-0000-4000-8000-000000000011','Marc_Tln','USER', now()-interval '2 months', current_date, true,false,true,null,'dm','{}');
SELECT u('00000000-0000-4000-8000-000000000012','Maëlle','USER', now()-interval '2 days', current_date, false,false,true,null,'dma','{}');
SELECT u('00000000-0000-4000-8000-000000000013','Sofiane','USER', now()-interval '9 days', current_date, false,false,true,null,'ds','{}');
SELECT u('00000000-0000-4000-8000-000000000014','Clara.L','USER', now()-interval '20 days', current_date-1, true,false,true,null,'dc','{"pixels/clara-1.jpg","pixels/clara-2.jpg"}');
SELECT u('00000000-0000-4000-8000-000000000015','Bernadette','USER', now()-interval '4 days', current_date, false,false,true,null,'db','{}');
SELECT u('00000000-0000-4000-8000-000000000016','Inès','USER', now()-interval '1 day', current_date, false,false,true,null,'appareil-ines','{}');
SELECT u('00000000-0000-4000-8000-000000000017','Ines_2','USER', now()-interval '1 day', null, false,false,false,null,'appareil-ines','{}');
SELECT u('00000000-0000-4000-8000-000000000018','Aïcha','USER', now()-interval '3 days', current_date, false,false,true,null,'da','{}');
SELECT u('00000000-0000-4000-8000-000000000019','Odile','USER', now()-interval '3 months', current_date, true,false,true,null,'do','{}');
SELECT u('00000000-0000-4000-8000-000000000020','Kevin_R','USER', now()-interval '1 month', current_date-12, false,true,true,null,'dk','{}');
SELECT u('00000000-0000-4000-8000-000000000021','Lou','USER', now()-interval '5 months', current_date-90, false,false,true,now()-interval '1 day','dl','{}');
SELECT u('00000000-0000-4000-8000-000000000022','Thomas','USER', now()-interval '1 month', current_date-1, true,false,true,null,'dt','{}');
SELECT u('00000000-0000-4000-8000-000000000023','Hugo','USER', now()-interval '6 days', current_date, false,false,true,null,'dh','{}');

INSERT INTO reports (id, "reporterId", "reportedId", reason, description, status, "createdAt") VALUES
 (gen_random_uuid(),'00000000-0000-4000-8000-000000000023','00000000-0000-4000-8000-000000000010','scam','Je suis coincé à l’aéroport, ma carte est bloquée. Tu pourrais m’envoyer 200 € par transfert ? Je te rembourse dès lundi.','pending', now()-interval '38 minutes'),
 (gen_random_uuid(),'00000000-0000-4000-8000-000000000019','00000000-0000-4000-8000-000000000010','scam','','pending', now()-interval '30 minutes'),
 (gen_random_uuid(),'00000000-0000-4000-8000-000000000022','00000000-0000-4000-8000-000000000010','scam','','pending', now()-interval '20 minutes'),
 (gen_random_uuid(),'00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000011','harassment','Message signalé par une membre : insulte après un refus de rendez-vous.','pending', now()-interval '6 hours');
INSERT INTO verification_requests (id, "userId", "selfieUrl", status, code_attendu, code_lu, tentative, "createdAt") VALUES
 (gen_random_uuid(),'00000000-0000-4000-8000-000000000012','/api/photos/x/selfie.jpg','pending','7358','7358',1, now()-interval '12 minutes'),
 (gen_random_uuid(),'00000000-0000-4000-8000-000000000013','/api/photos/x/selfie.jpg','pending','4926','4962',2, now()-interval '41 minutes'),
 (gen_random_uuid(),'00000000-0000-4000-8000-000000000015','/api/photos/x/selfie.jpg','pending','8253','',1, now()-interval '2 hours');
INSERT INTO verification_requests (id, "userId", "selfieUrl", status, "rejectReason", tentative, "createdAt", "resolvedAt") VALUES
 (gen_random_uuid(),'00000000-0000-4000-8000-000000000013','/api/photos/x/old.jpg','rejected','visage',1, now()-interval '2 days', now()-interval '2 days');
INSERT INTO profile_signals (id, "userId", type, force, extrait, "photoKey", "autreUserId", cle, "createdAt") VALUES
 (gen_random_uuid(),'00000000-0000-4000-8000-000000000014','contact_photo','fort','snap : clara.l_92','pixels/clara-2.jpg',null,'p', now()-interval '1 hour'),
 (gen_random_uuid(),'00000000-0000-4000-8000-000000000010','lexique_arnaque','fort','transfert',null,null,'l', now()-interval '1 day'),
 (gen_random_uuid(),'00000000-0000-4000-8000-000000000016','appareil_partage','faible',null,null,'00000000-0000-4000-8000-000000000017','a', now()-interval '5 hours'),
 (gen_random_uuid(),'00000000-0000-4000-8000-000000000017','appareil_partage','faible',null,null,'00000000-0000-4000-8000-000000000016','a', now()-interval '5 hours'),
 (gen_random_uuid(),'00000000-0000-4000-8000-000000000018','fuseau_incoherent','faible',null,null,null,'f', now()-interval '8 hours'),
 (gen_random_uuid(),'00000000-0000-4000-8000-000000000018','profil_express','faible',null,null,null,'e', now()-interval '8 hours'),
 (gen_random_uuid(),'00000000-0000-4000-8000-000000000018','inscriptions_groupees','faible',null,null,null,'g', now()-interval '8 hours');
INSERT INTO profile_answers (id, "userId", "questionKey", text, choices, status, "updatedAt") VALUES
 (gen_random_uuid(),'00000000-0000-4000-8000-000000000010','rire','Les chats qui ratent leur saut. Écris-moi sur wa, zéro six douze…','{}','published', now());
INSERT INTO moderation_logs (id, "adminId", "targetUserId", action, reason, "createdAt") VALUES
 (gen_random_uuid(), null,'00000000-0000-4000-8000-000000000010','INVITE_VERIFICATION','lexique_arnaque', now()-interval '1 day'),
 (gen_random_uuid(),'00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000013','REJECT_VERIFICATION','visage', now()-interval '2 days'),
 (gen_random_uuid(),'00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000020','BAN','Demande d’argent', now()-interval '12 days');

-- Liste longue (#568) : soixante comptes factices de plus, pour que « À traiter »
-- dépasse une page de vingt et que le défilement de la liste se mesure. Un
-- compte sur deux attend son selfie, un sur dix porte un signalement.
SELECT u(('00000000-0000-4000-8000-0000000' || lpad((1000+g)::text,5,'0'))::uuid,
         (ARRAY['Alix','Basile','Capucine','Dorian','Elsa','Farid','Gaëlle','Hervé','Isaure','Joachim','Katell','Lazare','Mona','Nils','Ondine','Pablo','Quitterie','Rémi','Solène','Titouan'])[1 + (g % 20)] || '_' || g,
         'USER', now()-(g||' days')::interval, current_date-(g % 30), g % 4 = 0, false, true, null, 'dx'||g, '{}')
FROM generate_series(1,60) g;
INSERT INTO verification_requests (id, "userId", "selfieUrl", status, code_attendu, code_lu, tentative, "createdAt")
  SELECT gen_random_uuid(), ('00000000-0000-4000-8000-0000000' || lpad((1000+g)::text,5,'0'))::uuid, '/api/photos/x/selfie.jpg','pending','2345','2345',1, now()-(g||' hours')::interval
  FROM generate_series(1,60) g WHERE g % 2 = 1;
INSERT INTO reports (id, "reporterId", "reportedId", reason, description, status, "createdAt")
  SELECT gen_random_uuid(), '00000000-0000-4000-8000-000000000023', ('00000000-0000-4000-8000-0000000' || lpad((1000+g)::text,5,'0'))::uuid, 'harassment','Texte factice de signalement.','pending', now()-(g||' hours')::interval
  FROM generate_series(1,60) g WHERE g % 10 = 0;

-- Groupe de signalements (#568) : trois signalements du même motif et un d'un
-- autre motif sur le même compte, pour le geste groupé.
SELECT u('00000000-0000-4000-8000-000000000030','Groupe_3','USER', now()-interval '3 days', current_date, false,false,true,null,'dg','{}');
INSERT INTO reports (id, "reporterId", "reportedId", reason, description, status, "createdAt") VALUES
 (gen_random_uuid(),'00000000-0000-4000-8000-000000000023','00000000-0000-4000-8000-000000000030','harassment','Premier texte factice.','pending', now()-interval '4 days'),
 (gen_random_uuid(),'00000000-0000-4000-8000-000000000019','00000000-0000-4000-8000-000000000030','harassment','','pending', now()-interval '4 days' + interval '1 hour'),
 (gen_random_uuid(),'00000000-0000-4000-8000-000000000022','00000000-0000-4000-8000-000000000030','harassment','','pending', now()-interval '4 days' + interval '2 hours'),
 (gen_random_uuid(),'00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000030','fake','Autre motif factice.','pending', now()-interval '1 hour');

DROP FUNCTION u(uuid, text, text, timestamptz, date, bool, bool, bool, timestamptz, text, text[]);
